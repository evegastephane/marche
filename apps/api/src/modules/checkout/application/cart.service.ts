import { Injectable } from '@nestjs/common';
import type { AddCartLineInput, CartDto, CheckoutInput, CheckoutResultDto } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { CatalogFacade, type VariantSnapshot } from '../../catalog/catalog.facade.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { MediaFacade } from '../../media/media.facade.js';
import { OrdersFacade } from '../../orders/orders.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { Cart } from '../domain/cart.js';
import {
  applyChanges,
  CartChangedError,
  type CheckoutContext,
  checkoutValidationChain,
  type VariantState,
} from '../domain/checkout-validation.js';
import { CartRepository } from './cart.repository.js';

/** UC-44 (panier) et UC-45 (checkout invité), pour la boutique résolue par le storefront. */
@Injectable()
export class CartService {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogFacade,
    private readonly inventory: InventoryFacade,
    private readonly media: MediaFacade,
    private readonly orders: OrdersFacade,
    private readonly stores: StoresFacade,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async create(): Promise<CartDto> {
    const cart = Cart.create(this.actor.storeId, this.clock.now());
    await this.carts.save(cart);
    return this.toDto(cart, new Map(), new Map());
  }

  async get(cartId: string): Promise<CartDto> {
    const cart = await this.load(cartId);
    const { snapshots, availability } = await this.lookups(cart);
    // L'acheteur voit toujours les prix actuels : ce sont eux qui feront foi au checkout.
    let changed = false;
    for (const line of cart.lines) {
      const snapshot = snapshots.get(line.variantId);
      if (snapshot?.sellable) changed = cart.refreshPrice(line.variantId, snapshot.unitPriceAmount, this.clock.now()) || changed;
    }
    if (changed) await this.carts.save(cart);
    return this.toDto(cart, snapshots, availability);
  }

  async addLine(cartId: string, input: AddCartLineInput): Promise<CartDto> {
    const cart = await this.load(cartId);
    const snapshot = (await this.catalog.snapshotVariants([input.variantId])).get(input.variantId);
    if (!snapshot?.sellable) {
      throw new ValidationError('ITEM_UNAVAILABLE', 'Cet article n’est pas disponible à la vente');
    }
    cart.addLine(input.variantId, input.quantity, snapshot.unitPriceAmount, this.clock.now());
    await this.carts.save(cart);
    return this.get(cartId);
  }

  async setQuantity(cartId: string, variantId: string, quantity: number): Promise<CartDto> {
    const cart = await this.load(cartId);
    cart.setQuantity(variantId, quantity, this.clock.now());
    await this.carts.save(cart);
    return this.get(cartId);
  }

  async removeLine(cartId: string, variantId: string): Promise<CartDto> {
    const cart = await this.load(cartId);
    cart.removeLine(variantId, this.clock.now());
    await this.carts.save(cart);
    return this.get(cartId);
  }

  /**
   * UC-45 : valide le panier (chaîne de validations), puis passe la commande (réservation atomique).
   * Si le panier a changé, il est corrigé et l'acheteur reçoit 409 CART_CHANGED avec le détail.
   */
  async checkout(input: CheckoutInput, options: { storeOpen: boolean }): Promise<CheckoutResultDto> {
    const cart = await this.load(input.cartId);
    if (cart.isEmpty) throw new ValidationError('VALIDATION_FAILED', 'Le panier est vide');

    const { snapshots, availability } = await this.lookups(cart);
    const variants = new Map<string, VariantState>(
      [...snapshots.values()].map((s) => [
        s.variantId,
        { sellable: s.sellable, unitPriceAmount: s.unitPriceAmount, trackInventory: s.trackInventory },
      ]),
    );
    const context: CheckoutContext = { cart, storeOpen: options.storeOpen, variants, availability, changes: [] };
    checkoutValidationChain().validate(context);
    if (context.changes.length > 0) {
      applyChanges(context, this.clock.now());
      await this.carts.save(cart);
      throw new CartChangedError(context.changes);
    }

    const result = await this.orders.placeFromStorefront({
      lines: cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      email: input.email,
      phone: input.phone,
      shippingAddress: input.shippingAddress,
      note: input.note,
    });
    await this.carts.delete(cart.storeId, cart.id);
    return result;
  }

  private async load(cartId: string): Promise<Cart> {
    const cart = await this.carts.find(this.actor.storeId, cartId);
    if (!cart) throw new NotFoundError('Panier', cartId);
    return cart;
  }

  private async lookups(cart: Cart) {
    const variantIds = cart.lines.map((line) => line.variantId);
    const [snapshots, availability] = await Promise.all([
      this.catalog.snapshotVariants(variantIds),
      this.inventory.availability(variantIds),
    ]);
    return { snapshots, availability };
  }

  private async toDto(
    cart: Cart,
    snapshots: Map<string, VariantSnapshot>,
    availability: Map<string, number>,
  ): Promise<CartDto> {
    const settings = await this.stores.getSettings(cart.storeId);
    const images = await this.media.getMany(
      [...snapshots.values()].map((s) => s.imageMediaId).filter((id): id is string => id !== null),
    );
    const lines = cart.lines.map((line) => {
      const snapshot = snapshots.get(line.variantId);
      const image = snapshot?.imageMediaId ? images.get(snapshot.imageMediaId) : undefined;
      return {
        variantId: line.variantId,
        productId: snapshot?.productId ?? null,
        productSlug: snapshot?.productSlug ?? null,
        productTitle: snapshot?.productTitle ?? 'Article indisponible',
        variantTitle: snapshot?.variantTitle ?? '',
        sku: snapshot?.sku ?? null,
        imageUrl: image ? (image.renditions['400'] ?? image.url) : null,
        unitPriceAmount: line.unitPriceAmount,
        quantity: line.quantity,
        lineTotalAmount: line.unitPriceAmount * line.quantity,
        available: snapshot?.trackInventory ? (availability.get(line.variantId) ?? 0) : null,
        isSellable: snapshot?.sellable ?? false,
      };
    });
    const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotalAmount, 0);
    const shippingAmount = await this.orders.shippingAmountFor(subtotalAmount);
    return {
      id: cart.id,
      currency: settings.currency,
      lines,
      itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotalAmount,
      shippingAmount,
      totalAmount: subtotalAmount + shippingAmount,
      updatedAt: cart.toData().updatedAt,
    };
  }
}
