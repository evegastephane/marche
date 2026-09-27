import { describe, expect, it } from 'vitest';
import { Cart } from './cart.js';
import {
  applyChanges,
  type CheckoutContext,
  checkoutValidationChain,
  StoreClosedError,
  type VariantState,
} from './checkout-validation.js';

const now = new Date('2026-09-27T10:00:00Z');

function context(
  lines: { variantId: string; quantity: number; price: number }[],
  variants: Record<string, VariantState>,
  availability: Record<string, number> = {},
  storeOpen = true,
): CheckoutContext {
  const cart = Cart.create('s1', now);
  for (const line of lines) cart.addLine(line.variantId, line.quantity, line.price, now);
  return {
    cart,
    storeOpen,
    variants: new Map(Object.entries(variants)),
    availability: new Map(Object.entries(availability)),
    changes: [],
  };
}

const sellable = (price: number, trackInventory = true): VariantState => ({ sellable: true, unitPriceAmount: price, trackInventory });

describe('Chaîne de validation du checkout', () => {
  it('laisse passer un panier valide', () => {
    const ctx = context([{ variantId: 'a', quantity: 2, price: 100 }], { a: sellable(100) }, { a: 5 });
    checkoutValidationChain().validate(ctx);
    expect(ctx.changes).toEqual([]);
  });

  it('refuse d’emblée si la boutique est fermée', () => {
    const ctx = context([{ variantId: 'a', quantity: 1, price: 100 }], { a: sellable(100) }, { a: 5 }, false);
    expect(() => checkoutValidationChain().validate(ctx)).toThrow(StoreClosedError);
  });

  it('consigne chaque problème sans s’arrêter au premier', () => {
    const ctx = context(
      [
        { variantId: 'gone', quantity: 1, price: 100 },
        { variantId: 'short', quantity: 3, price: 100 },
        { variantId: 'pricey', quantity: 1, price: 100 },
        { variantId: 'free', quantity: 50, price: 100 },
      ],
      {
        gone: { sellable: false, unitPriceAmount: 100, trackInventory: true },
        short: sellable(100),
        pricey: sellable(120),
        free: sellable(100, false),
      },
      { short: 1, pricey: 9 },
    );
    checkoutValidationChain().validate(ctx);
    expect(ctx.changes).toEqual([
      { variantId: 'gone', reason: 'ITEM_UNAVAILABLE' },
      { variantId: 'short', reason: 'INSUFFICIENT_STOCK', available: 1 },
      { variantId: 'pricey', reason: 'PRICE_CHANGED', previousPriceAmount: 100, currentPriceAmount: 120 },
    ]);

    applyChanges(ctx, now);
    expect(ctx.cart.lines.map((l) => [l.variantId, l.quantity, l.unitPriceAmount])).toEqual([
      ['short', 1, 100],
      ['pricey', 1, 120],
      ['free', 50, 100],
    ]);
  });

  it('retire une ligne dont le stock est épuisé', () => {
    const ctx = context([{ variantId: 'a', quantity: 2, price: 100 }], { a: sellable(100) }, { a: 0 });
    checkoutValidationChain().validate(ctx);
    applyChanges(ctx, now);
    expect(ctx.cart.isEmpty).toBe(true);
  });
});

describe('Cart', () => {
  it('cumule les quantités, plafonne à 99 et limite le nombre de lignes', () => {
    const cart = Cart.create('s1', now);
    cart.addLine('a', 60, 100, now);
    cart.addLine('a', 60, 110, now);
    expect(cart.lines).toEqual([{ variantId: 'a', quantity: 99, unitPriceAmount: 110 }]);
    for (let i = 0; i < 49; i++) cart.addLine(`v${i}`, 1, 1, now);
    expect(() => cart.addLine('one-too-many', 1, 1, now)).toThrow(/limité à 50/);
  });

  it('retire une ligne mise à 0', () => {
    const cart = Cart.create('s1', now);
    cart.addLine('a', 2, 100, now);
    cart.setQuantity('a', 0, now);
    expect(cart.isEmpty).toBe(true);
  });
});
