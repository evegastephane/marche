import { describe, expect, it } from 'vitest';
import { Order, type NewOrderLine } from './order.aggregate.js';
import { InvalidOrderTransitionError } from './order-state.js';
import { FlatRateShipping, FreeOverThresholdShipping, shippingStrategyFor } from './shipping-strategy.js';

const now = new Date('2026-09-27T10:00:00Z');

const line = (overrides: Partial<NewOrderLine> = {}): NewOrderLine => ({
  variantId: 'v1',
  productTitle: 'Pagne',
  variantTitle: 'Par défaut',
  sku: 'P-1',
  unitPriceAmount: 1000,
  quantity: 2,
  tracksInventory: true,
  ...overrides,
});

function draft() {
  return Order.createDraft({ storeId: 's1', currency: 'EUR', source: 'ADMIN', email: 'a@b.co' }, now);
}

function placed() {
  const order = draft();
  order.place({ number: 1001, lines: [line()], shipping: new FlatRateShipping(500), customerId: null }, now);
  return order;
}

describe('Order : machine à états', () => {
  it('DRAFT → PLACED fige les lignes, attribue le numéro et calcule les totaux', () => {
    const order = placed();
    expect(order.status).toBe('PLACED');
    expect(order.snapshot()).toMatchObject({ number: 1001, subtotalAmount: 2000, shippingAmount: 500, totalAmount: 2500 });
    const [event] = order.pullEvents();
    expect(event).toMatchObject({ type: 'orders.order.placed', payload: { number: 1001, totalAmount: 2500, itemsCount: 2 } });
  });

  it('refuse de passer une commande vide', () => {
    expect(() =>
      draft().place({ number: 1, lines: [], shipping: new FlatRateShipping(0), customerId: null }, now),
    ).toThrow(/aucun article/);
  });

  it.each([
    ['expédier un brouillon', (o: Order) => o.fulfill(now)],
    ['marquer payé un brouillon', (o: Order) => o.markPaid(now)],
  ])('refuse de %s', (_label, action) => {
    expect(() => action(draft())).toThrow(InvalidOrderTransitionError);
  });

  it('PLACED → FULFILLED, paiement possible avant ou après', () => {
    const order = placed();
    order.markPaid(now);
    order.fulfill(now);
    expect(order.snapshot()).toMatchObject({ status: 'FULFILLED', paymentStatus: 'PAID' });
    expect(() => order.markPaid(now)).toThrow(InvalidOrderTransitionError);
    expect(() => order.cancel('trop tard', now)).toThrow(InvalidOrderTransitionError);
  });

  it('annuler retourne l’état précédent (PLACED ⇒ stock à libérer)', () => {
    expect(placed().cancel('client', now)).toBe('PLACED');
    expect(draft().cancel('doublon', now)).toBe('DRAFT');
  });

  it('ne modifie plus les lignes après le passage', () => {
    const order = placed();
    expect(() => order.replaceLines([line()], new FlatRateShipping(0), now)).toThrow(InvalidOrderTransitionError);
  });

  it('ne réserve que les lignes suivies en stock', () => {
    const order = draft();
    order.place(
      {
        number: 1,
        lines: [line(), line({ variantId: 'v2', tracksInventory: false, quantity: 1 })],
        shipping: new FlatRateShipping(0),
        customerId: null,
      },
      now,
    );
    expect(order.reservedLines()).toEqual([{ variantId: 'v1', quantity: 2 }]);
  });

  it('génère un lien de suivi public non devinable', () => {
    expect(draft().snapshot().publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('Stratégies de livraison', () => {
  it('forfait : gratuit pour un panier vide', () => {
    const shipping = new FlatRateShipping(990);
    expect(shipping.compute(0)).toBe(0);
    expect(shipping.compute(1)).toBe(990);
  });

  it('offerte au-delà d’un seuil', () => {
    const shipping = new FreeOverThresholdShipping(990, 5000);
    expect(shipping.compute(4999)).toBe(990);
    expect(shipping.compute(5000)).toBe(0);
  });

  it('se choisit depuis la configuration de la boutique', () => {
    expect(shippingStrategyFor({ strategy: 'FLAT_RATE', flatRateAmount: 300 })).toBeInstanceOf(FlatRateShipping);
    expect(
      shippingStrategyFor({ strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 300, thresholdAmount: 1000 }),
    ).toBeInstanceOf(FreeOverThresholdShipping);
  });
});
