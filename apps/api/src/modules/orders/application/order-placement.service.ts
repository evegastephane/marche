import { Injectable } from '@nestjs/common';
import type { CustomOrderLineInput, OrderLineInput } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import type { NewOrderLine, Order, PricedLines } from '../domain/order.aggregate.js';
import { CustomerRepository, OrderRepository } from '../domain/order.repositories.js';
import { shippingStrategyFor, type ShippingStrategy } from '../domain/shipping-strategy.js';

/** Référence affichée sur une ligne libre (commande sur demande). */
export const CUSTOM_LINE_SKU = 'SUR-DEMANDE';

/** Lignes demandées : déclinaisons du catalogue et lignes libres. */
export interface OrderLinesRequest {
  lines: readonly OrderLineInput[];
  customLines?: readonly CustomOrderLineInput[];
}

export class ItemUnavailableError extends ConflictError {
  constructor(variantIds: string[]) {
    super('ITEM_UNAVAILABLE', 'Certains articles ne sont plus disponibles à la vente', { variantIds });
  }
}

/**
 * Passage d'une commande (UC-31), partagé par le back-office et le checkout du site :
 * instantané des lignes (R6) → numéro (R8) → réservation atomique du stock (R5) → client → outbox.
 * Tout s'exécute dans une seule transaction.
 */
@Injectable()
export class OrderPlacementService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerRepository,
    private readonly catalog: CatalogFacade,
    private readonly inventory: InventoryFacade,
    private readonly stores: StoresFacade,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async shippingStrategy(): Promise<ShippingStrategy> {
    const settings = await this.stores.getSettings(this.actor.storeId);
    return shippingStrategyFor(settings.shippingSettings);
  }

  /**
   * Lignes figées à partir du catalogue, lignes libres ensuite, et remises des packs recalculées
   * sur les prix du moment. `requireSellable` (site) refuse les produits non publiés ;
   * le back-office peut vendre un produit en brouillon, mais jamais une variante archivée.
   */
  async priceLines(request: OrderLinesRequest, requireSellable: boolean): Promise<PricedLines> {
    const { lines, customLines = [] } = request;
    const snapshots = await this.catalog.snapshotVariants(lines.map((line) => line.variantId));
    const unknown = lines.filter((line) => !snapshots.has(line.variantId)).map((line) => line.variantId);
    if (unknown.length > 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Variantes introuvables', { variantIds: unknown });
    }
    const unavailable = lines
      .filter((line) => {
        const snapshot = snapshots.get(line.variantId);
        return !snapshot || snapshot.variantArchived || (requireSellable && !snapshot.sellable);
      })
      .map((line) => line.variantId);
    if (unavailable.length > 0) throw new ItemUnavailableError(unavailable);

    const catalogLines = lines.map((line) => {
      const snapshot = snapshots.get(line.variantId);
      if (!snapshot) throw new ValidationError('VALIDATION_FAILED', 'Variante introuvable');
      return { snapshot, quantity: line.quantity };
    });
    const bundleDiscounts = await this.catalog.priceBundles(
      catalogLines.map(({ snapshot, quantity }) => ({
        productId: snapshot.productId,
        unitPriceAmount: snapshot.unitPriceAmount,
        quantity,
      })),
    );
    const priced: NewOrderLine[] = [
      ...catalogLines.map(({ snapshot, quantity }) => ({
        variantId: snapshot.variantId,
        productTitle: snapshot.productTitle,
        variantTitle: snapshot.variantTitle,
        sku: snapshot.sku,
        unitPriceAmount: snapshot.unitPriceAmount,
        quantity,
        tracksInventory: snapshot.trackInventory,
        custom: false,
      })),
      ...customLines.map((line) => ({
        variantId: null,
        productTitle: line.title,
        variantTitle: line.variantTitle,
        sku: CUSTOM_LINE_SKU,
        unitPriceAmount: line.unitPriceAmount,
        quantity: line.quantity,
        tracksInventory: false,
        custom: true,
      })),
    ];
    return {
      lines: priced,
      discounts: bundleDiscounts.map((discount) => ({
        bundleId: discount.bundleId,
        title: discount.quantity > 1 ? `${discount.title} × ${discount.quantity}` : discount.title,
        amount: discount.amount,
      })),
    };
  }

  async place(
    order: Order,
    input: {
      request: OrderLinesRequest;
      requireSellable: boolean;
      customer?: { firstName?: string | null; lastName?: string | null; phone?: string | null; whatsappOptIn?: boolean };
      isNew: boolean;
    },
  ): Promise<void> {
    await this.uow.run(async () => {
      const storeId = this.actor.storeId;
      const priced = await this.priceLines(input.request, input.requireSellable);
      const shipping = await this.shippingStrategy();
      const number = await this.stores.nextOrderNumber(storeId);
      const email = order.email;
      const customerId = email
        ? await this.customers.upsertByEmail({
            email,
            firstName: input.customer?.firstName ?? order.snapshot().shippingAddress?.firstName ?? null,
            lastName: input.customer?.lastName ?? order.snapshot().shippingAddress?.lastName ?? null,
            phone: input.customer?.phone ?? order.snapshot().shippingAddress?.phone ?? null,
            defaultAddress: order.snapshot().shippingAddress,
            whatsappOptIn: input.customer?.whatsappOptIn,
          })
        : null;
      order.place({ number, priced, shipping, customerId }, this.clock.now());
      await this.inventory.reserve(order.reservedLines());
      if (input.isNew) await this.orders.insert(order);
      else await this.orders.update(order);
      await this.outbox.addAll(order.pullEvents());
    });
  }
}
