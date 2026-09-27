import type { CartChangeDto } from '@marche/contracts';
import { ConflictError } from '../../../shared/domain/domain-error.js';
import type { Cart } from './cart.js';

/** Ce que le catalogue et le stock disent d'une variante au moment du checkout. */
export interface VariantState {
  sellable: boolean;
  unitPriceAmount: number;
  trackInventory: boolean;
}

export interface CheckoutContext {
  cart: Cart;
  storeOpen: boolean;
  variants: ReadonlyMap<string, VariantState>;
  /** Disponible par variante suivie en stock. */
  availability: ReadonlyMap<string, number>;
  changes: CartChangeDto[];
}

export class StoreClosedError extends ConflictError {
  constructor() {
    super('CART_CHANGED', 'La boutique n’accepte pas de commande pour le moment');
  }
}

/** Le panier a changé : l'acheteur doit revoir son panier avant de valider. */
export class CartChangedError extends ConflictError {
  constructor(readonly changes: CartChangeDto[]) {
    super('CART_CHANGED', 'Votre panier a été mis à jour : vérifiez-le avant de valider', { changes });
  }
}

/**
 * Chaîne de validations du checkout (pattern Chain of Responsibility, docs/ARCHITECTURE.md §5.3) :
 * StoreOpen → ItemsSellable → StockAvailable → PriceUnchanged. Chaque maillon consigne ses constats.
 */
export abstract class CheckoutValidator {
  private next?: CheckoutValidator;

  /** Chaîne le maillon suivant et le retourne (pour enchaîner les appels). */
  linkTo(next: CheckoutValidator): CheckoutValidator {
    this.next = next;
    return next;
  }

  validate(context: CheckoutContext): void {
    this.check(context);
    this.next?.validate(context);
  }

  protected abstract check(context: CheckoutContext): void;
}

export class StoreOpenValidator extends CheckoutValidator {
  protected check(context: CheckoutContext): void {
    if (!context.storeOpen) throw new StoreClosedError();
  }
}

export class ItemsSellableValidator extends CheckoutValidator {
  protected check(context: CheckoutContext): void {
    for (const line of context.cart.lines) {
      if (!context.variants.get(line.variantId)?.sellable) {
        context.changes.push({ variantId: line.variantId, reason: 'ITEM_UNAVAILABLE' });
      }
    }
  }
}

export class StockAvailableValidator extends CheckoutValidator {
  protected check(context: CheckoutContext): void {
    for (const line of context.cart.lines) {
      const variant = context.variants.get(line.variantId);
      if (!variant?.sellable || !variant.trackInventory) continue;
      const available = context.availability.get(line.variantId) ?? 0;
      if (line.quantity > available) {
        context.changes.push({ variantId: line.variantId, reason: 'INSUFFICIENT_STOCK', available });
      }
    }
  }
}

export class PriceUnchangedValidator extends CheckoutValidator {
  protected check(context: CheckoutContext): void {
    for (const line of context.cart.lines) {
      const variant = context.variants.get(line.variantId);
      if (variant?.sellable && variant.unitPriceAmount !== line.unitPriceAmount) {
        context.changes.push({
          variantId: line.variantId,
          reason: 'PRICE_CHANGED',
          previousPriceAmount: line.unitPriceAmount,
          currentPriceAmount: variant.unitPriceAmount,
        });
      }
    }
  }
}

export function checkoutValidationChain(): CheckoutValidator {
  const head = new StoreOpenValidator();
  head
    .linkTo(new ItemsSellableValidator())
    .linkTo(new StockAvailableValidator())
    .linkTo(new PriceUnchangedValidator());
  return head;
}

/**
 * Applique les constats au panier pour que l'acheteur voie un panier valide :
 * articles indisponibles retirés, quantités ramenées au stock, prix actualisés.
 */
export function applyChanges(context: CheckoutContext, now: Date): void {
  for (const change of context.changes) {
    switch (change.reason) {
      case 'ITEM_UNAVAILABLE':
        context.cart.removeLine(change.variantId, now);
        break;
      case 'INSUFFICIENT_STOCK':
        if ((change.available ?? 0) <= 0) context.cart.removeLine(change.variantId, now);
        else context.cart.setQuantity(change.variantId, Math.min(change.available ?? 0, 99), now);
        break;
      case 'PRICE_CHANGED':
        if (change.currentPriceAmount !== undefined) {
          context.cart.refreshPrice(change.variantId, change.currentPriceAmount, now);
        }
        break;
    }
  }
}
