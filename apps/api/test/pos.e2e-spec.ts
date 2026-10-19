import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categoryId, createStoreFor, createTestApp, type TestApp, uniqueSlug } from './support/test-app.js';

/** IMEI de test à 15 chiffres avec une clé de Luhn valide. */
function imei(body14: string): string {
  const sum = body14
    .split('')
    .reverse()
    .reduce((total, char, index) => {
      const digit = Number(char) * (index % 2 === 0 ? 2 : 1);
      return total + (digit > 9 ? digit - 9 : digit);
    }, 0);
  return `${body14}${(10 - (sum % 10)) % 10}`;
}

const IMEIS = Array.from({ length: 4 }, (_, i) => imei(`3569380356431${i}`));

describe('Caisse : sessions, ventes au comptoir, retours (e2e)', () => {
  let t: TestApp;
  let ownerToken: string;
  let staffToken: string;
  let phone: { productId: string; variantId: string };
  let cable: { productId: string; variantId: string };
  let ownerSession: { id: string; version: number };
  let staffSession: { id: string; version: number };

  const owner = () => ({ Authorization: `Bearer ${ownerToken}` });
  const staff = () => ({ Authorization: `Bearer ${staffToken}` });

  const sell = (auth: Record<string, string>, body: object, key: string = randomUUID()) =>
    t.http().post('/api/v1/pos/sales').set(auth).set('Idempotency-Key', key).send(body);

  async function stockOf(productId: string) {
    const product = await t.http().get(`/api/v1/products/${productId}`).set(owner());
    return product.body.variants[0].inventory as { onHand: number; reserved: number; available: number };
  }

  async function session(id: string, auth = owner()) {
    const response = await t.http().get(`/api/v1/pos/sessions/${id}`).set(auth);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body;
  }

  beforeAll(async () => {
    t = await createTestApp();
    const slug = uniqueSlug('caisse');
    ({ token: ownerToken } = await createStoreFor(t, { slug, currency: 'XOF', country: 'CI', type: 'ELECTRONICS' }));
    staffToken = await t.token({ sub: `user_vendeur_${randomUUID().slice(0, 8)}`, orgId: t.organizations.orgIdFor(slug), orgRole: 'member' });

    const created = await t
      .http()
      .post('/api/v1/products')
      .set(owner())
      .send({
        title: 'Galaxy A56',
        categoryId: await categoryId(t, ownerToken, 'smartphones'),
        variants: [
          {
            sku: 'GA56-128-NOI',
            barcode: '8806095467810',
            options: { stockage: '128 Go', couleur: 'Noir', etat: 'Neuf', sim: 'Double SIM', 'taille-ecran': '6,7 pouces' },
            priceAmount: 250_000,
            units: IMEIS.map((serial) => ({ serial })),
          },
        ],
      });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    phone = { productId: created.body.id, variantId: created.body.variants[0].id };

    const accessory = await t
      .http()
      .post('/api/v1/products')
      .set(owner())
      .send({
        title: 'Câble USB-C',
        categoryId: await categoryId(t, ownerToken, 'autres'),
        variants: [{ sku: 'CBL-USBC-1M', barcode: '3700000000017', priceAmount: 5_000, initialQuantity: 20 }],
      });
    expect(accessory.status, JSON.stringify(accessory.body)).toBe(201);
    cable = { productId: accessory.body.id, variantId: accessory.body.variants[0].id };
  });

  afterAll(async () => {
    await t?.close();
  });

  it('règle la caisse : seul un administrateur change les réglages', async () => {
    const defaults = await t.http().get('/api/v1/pos/settings').set(staff());
    expect(defaults.status).toBe(200);
    expect(defaults.body).toMatchObject({ staffDiscountMaxPercent: 0, acceptCard: true, acceptBankTransfer: false, receiptWidth: '80' });

    const forbidden = await t.http().put('/api/v1/pos/settings').set(staff()).send({ staffDiscountMaxPercent: 50 });
    expect(forbidden.status).toBe(403);

    const updated = await t.http().put('/api/v1/pos/settings').set(owner()).send({ receiptWidth: '58' });
    expect(updated.status, JSON.stringify(updated.body)).toBe(200);
    expect(updated.body).toMatchObject({ receiptWidth: '58', staffDiscountMaxPercent: 0 });
  });

  it('ouvre une caisse par vendeur, avec son fond', async () => {
    const none = await t.http().get('/api/v1/pos/session').set(owner());
    expect(none.body).toEqual({ session: null });

    const opened = await t.http().post('/api/v1/pos/sessions').set(owner()).send({ openingFloat: 20_000, label: 'Comptoir' });
    expect(opened.status, JSON.stringify(opened.body)).toBe(201);
    expect(opened.body).toMatchObject({ status: 'OPEN', openingFloat: 20_000, label: 'Comptoir', totals: { expectedCash: 20_000 } });
    ownerSession = opened.body;

    const again = await t.http().post('/api/v1/pos/sessions').set(owner()).send({ openingFloat: 0 });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('POS_SESSION_ALREADY_OPEN');

    const current = await t.http().get('/api/v1/pos/session').set(owner());
    expect(current.body.session.id).toBe(ownerSession.id);

    const staffOpened = await t.http().post('/api/v1/pos/sessions').set(staff()).send({ openingFloat: 5_000 });
    expect(staffOpened.status).toBe(201);
    staffSession = staffOpened.body;
  });

  it('lit un code-barres, un SKU ou un IMEI, et retrouve les articles par leur nom', async () => {
    const byBarcode = await t.http().get('/api/v1/pos/lookup').query({ code: '3700000000017' }).set(staff());
    expect(byBarcode.status, JSON.stringify(byBarcode.body)).toBe(200);
    expect(byBarcode.body).toMatchObject({ serial: null, variant: { variantId: cable.variantId, available: 20, tracksUnits: false } });

    const bySku = await t.http().get('/api/v1/pos/lookup').query({ code: 'cbl-usbc-1m' }).set(staff());
    expect(bySku.body.variant.variantId).toBe(cable.variantId);

    const byImei = await t.http().get('/api/v1/pos/lookup').query({ code: IMEIS[0] }).set(staff());
    expect(byImei.body).toMatchObject({ serial: IMEIS[0], variant: { variantId: phone.variantId, tracksUnits: true, available: 4 } });

    const unknown = await t.http().get('/api/v1/pos/lookup').query({ code: '0000000000000' }).set(staff());
    expect(unknown.status).toBe(404);

    const search = await t.http().get('/api/v1/pos/variants').query({ q: 'galaxy' }).set(staff());
    expect(search.body.items.map((item: { variantId: string }) => item.variantId)).toEqual([phone.variantId]);
  });

  it('encaisse en espèces : le stock sort, la monnaie est rendue, la vente est payée et remise', async () => {
    const sale = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: cable.variantId, quantity: 3 }],
      payments: [{ method: 'CASH', amount: 20_000 }],
    });
    expect(sale.status, JSON.stringify(sale.body)).toBe(201);
    expect(sale.body).toMatchObject({
      changeAmount: 5_000,
      order: {
        source: 'POS',
        status: 'FULFILLED',
        paymentStatus: 'PAID',
        totalAmount: 15_000,
        shippingAmount: 0,
        shippingMethod: 'IN_STORE',
        posSessionId: staffSession.id,
        payments: [{ kind: 'PAYMENT', method: 'CASH', amount: 15_000, tenderedAmount: 20_000, changeAmount: 5_000 }],
      },
    });
    expect(await stockOf(cable.productId)).toEqual({ onHand: 17, reserved: 0, available: 17 });
    expect((await session(staffSession.id, staff())).totals).toMatchObject({ salesCount: 1, cashPayments: 15_000, expectedCash: 20_000 });
  });

  it('exige l’IMEI d’un téléphone, puis le marque vendu', async () => {
    const missing = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: phone.variantId, quantity: 1 }],
      payments: [{ method: 'CASH', amount: 250_000 }],
    });
    expect(missing.status).toBe(422);
    expect(missing.body.code).toBe('SERIALS_REQUIRED');

    const sale = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: phone.variantId, quantity: 1, serials: [IMEIS[0]] }],
      payments: [{ method: 'MOBILE_MONEY', amount: 250_000, provider: 'Wave', reference: 'WV-123' }],
      customer: { phone: '+225 07 07 12 34 56', firstName: 'Awa' },
    });
    expect(sale.status, JSON.stringify(sale.body)).toBe(201);
    expect(sale.body.order.lines[0].serialNumbers).toEqual([IMEIS[0]]);
    expect(sale.body.order.customer).toMatchObject({ email: null, phone: '+225 07 07 12 34 56', firstName: 'Awa' });

    const sold = await t.http().get('/api/v1/pos/lookup').query({ code: IMEIS[0] }).set(staff());
    expect(sold.status).toBe(422);
    expect(sold.body.detail).toContain('déjà vendu');
  });

  it('retrouve le client du comptoir par son téléphone, écrit autrement', async () => {
    const sale = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: cable.variantId, quantity: 1 }],
      payments: [{ method: 'CASH', amount: 5_000 }],
      customer: { phone: '0707123456' },
    });
    expect(sale.status, JSON.stringify(sale.body)).toBe(201);
    const customers = await t.http().get('/api/v1/customers').query({ q: '0707' }).set(owner());
    expect(customers.body.items).toHaveLength(1);
    expect(customers.body.items[0]).toMatchObject({ firstName: 'Awa', ordersCount: 2 });
  });

  it('refuse un paiement insuffisant, un paiement électronique au-delà du total, un moyen non accepté', async () => {
    const base = { sessionId: staffSession.id, lines: [{ variantId: cable.variantId, quantity: 1 }] };
    const short = await sell(staff(), { ...base, payments: [{ method: 'CASH', amount: 4_000 }] });
    expect(short.status).toBe(422);
    expect(short.body.code).toBe('PAYMENT_INSUFFICIENT');

    const over = await sell(staff(), { ...base, payments: [{ method: 'CARD', amount: 6_000 }] });
    expect(over.body.code).toBe('PAYMENT_EXCEEDS_TOTAL');

    const transfer = await sell(staff(), { ...base, payments: [{ method: 'BANK_TRANSFER', amount: 5_000 }] });
    expect(transfer.body.code).toBe('PAYMENT_METHOD_DISABLED');

    const mixed = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: cable.variantId, quantity: 2 }],
      payments: [
        { method: 'MOBILE_MONEY', amount: 6_000, provider: 'Orange Money' },
        { method: 'CASH', amount: 5_000 },
      ],
    });
    expect(mixed.status, JSON.stringify(mixed.body)).toBe(201);
    expect(mixed.body.changeAmount).toBe(1_000);
    expect(await stockOf(cable.productId)).toMatchObject({ onHand: 14 });
  });

  it('plafonne la remise d’un vendeur, laisse l’administrateur libre', async () => {
    const body = (sessionId: string) => ({
      sessionId,
      lines: [{ variantId: cable.variantId, quantity: 2 }],
      discount: { kind: 'PERCENT', value: 10, reason: 'Fidélité' },
      payments: [{ method: 'CASH', amount: 9_000 }],
    });
    const refused = await sell(staff(), body(staffSession.id));
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('DISCOUNT_NOT_ALLOWED');

    // Le devis annonce le total exact, et applique la même règle de remise.
    const quoteBody = { lines: [{ variantId: cable.variantId, quantity: 2 }], discount: { kind: 'PERCENT', value: 10 } };
    expect((await t.http().post('/api/v1/pos/quote').set(staff()).send(quoteBody)).status).toBe(403);
    const quote = await t.http().post('/api/v1/pos/quote').set(owner()).send(quoteBody);
    expect(quote.body).toMatchObject({ subtotalAmount: 10_000, discountAmount: 1_000, totalAmount: 9_000 });

    const allowed = await sell(owner(), body(ownerSession.id));
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(201);
    expect(allowed.body.order).toMatchObject({
      subtotalAmount: 10_000,
      discountAmount: 1_000,
      totalAmount: 9_000,
      discounts: [{ bundleId: null, title: 'Remise : Fidélité', amount: 1_000 }],
    });

    await t.http().put('/api/v1/pos/settings').set(owner()).send({ staffDiscountMaxPercent: 10 });
    expect((await sell(staff(), body(staffSession.id))).status).toBe(201);
  });

  it('n’encaisse qu’une fois malgré un double envoi, et jamais dans la caisse d’un autre', async () => {
    const key = randomUUID();
    const body = { sessionId: staffSession.id, lines: [{ variantId: cable.variantId, quantity: 1 }], payments: [{ method: 'CASH', amount: 5_000 }] };
    const first = await sell(staff(), body, key);
    const replay = await sell(staff(), body, key);
    expect(first.status).toBe(201);
    expect(replay.body.order.id).toBe(first.body.order.id);

    const foreign = await sell(staff(), { ...body, sessionId: ownerSession.id });
    expect(foreign.status).toBe(403);
    expect(foreign.body.code).toBe('POS_SESSION_NOT_YOURS');
  });

  it('reprend un article : avoir pour un vendeur, remboursement en espèces pour un administrateur', async () => {
    const sale = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: cable.variantId, quantity: 2 }],
      payments: [{ method: 'CASH', amount: 10_000 }],
    });
    const order = sale.body.order;
    const before = await stockOf(cable.productId);

    const cashByStaff = await t
      .http()
      .post(`/api/v1/pos/sales/${order.id}/returns`)
      .set(staff())
      .set('Idempotency-Key', randomUUID())
      .send({ sessionId: staffSession.id, lines: [{ orderLineId: order.lines[0].id, quantity: 1 }], refund: { method: 'CASH' }, reason: 'Ne charge pas' });
    expect(cashByStaff.status).toBe(403);

    const credit = await t
      .http()
      .post(`/api/v1/pos/sales/${order.id}/returns`)
      .set(staff())
      .set('Idempotency-Key', randomUUID())
      .send({ sessionId: staffSession.id, lines: [{ orderLineId: order.lines[0].id, quantity: 1 }], refund: { method: 'EXCHANGE' }, reason: 'Échange contre un autre câble' });
    expect(credit.status, JSON.stringify(credit.body)).toBe(201);
    expect(credit.body.orderReturn).toMatchObject({ refundAmount: 5_000, refundMethod: 'EXCHANGE', creditRemaining: 5_000, restocked: true });
    expect(credit.body.order).toMatchObject({ refundedAmount: 5_000, paymentStatus: 'PAID' });
    expect((await stockOf(cable.productId)).onHand).toBe(before.onHand + 1);

    // L'avoir paie la vente de l'échange, une seule fois.
    const exchange = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: cable.variantId, quantity: 2 }],
      payments: [
        { method: 'EXCHANGE', amount: 5_000, returnId: credit.body.orderReturn.id },
        { method: 'CASH', amount: 5_000 },
      ],
    });
    expect(exchange.status, JSON.stringify(exchange.body)).toBe(201);
    const reused = await sell(staff(), {
      sessionId: staffSession.id,
      lines: [{ variantId: cable.variantId, quantity: 1 }],
      payments: [{ method: 'EXCHANGE', amount: 5_000, returnId: credit.body.orderReturn.id }],
    });
    expect(reused.status).toBe(409);
    expect(reused.body.code).toBe('CREDIT_UNAVAILABLE');

    // L'administrateur rembourse le dernier câble en espèces, depuis sa caisse : la commande est soldée.
    const tooMuch = await t
      .http()
      .post(`/api/v1/pos/sales/${order.id}/returns`)
      .set(owner())
      .set('Idempotency-Key', randomUUID())
      .send({ sessionId: ownerSession.id, lines: [{ orderLineId: order.lines[0].id, quantity: 2 }], refund: { method: 'CASH' }, reason: 'Erreur' });
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.code).toBe('RETURN_EXCEEDS_SALE');

    const refund = await t
      .http()
      .post(`/api/v1/pos/sales/${order.id}/returns`)
      .set(owner())
      .set('Idempotency-Key', randomUUID())
      .send({ sessionId: ownerSession.id, lines: [{ orderLineId: order.lines[0].id, quantity: 1 }], refund: { method: 'CASH' }, restock: false, reason: 'Défectueux' });
    expect(refund.status, JSON.stringify(refund.body)).toBe(201);
    expect(refund.body.order).toMatchObject({ refundedAmount: 10_000, paymentStatus: 'REFUNDED' });
    expect((await session(ownerSession.id)).totals).toMatchObject({ cashRefunds: 5_000, refundAmount: 5_000 });
  });

  it('remet un téléphone rapporté en stock avec son IMEI', async () => {
    const sales = await t.http().get('/api/v1/pos/sales').query({ sessionId: staffSession.id }).set(staff());
    const phoneSale = sales.body.items.find((item: { methods: string[] }) => item.methods.includes('MOBILE_MONEY') && item.methods.length === 1);
    const detail = await t.http().get(`/api/v1/pos/sales/${phoneSale.orderId}`).set(staff());
    const line = detail.body.order.lines[0];

    const noImei = await t
      .http()
      .post(`/api/v1/pos/sales/${phoneSale.orderId}/returns`)
      .set(staff())
      .set('Idempotency-Key', randomUUID())
      .send({ sessionId: staffSession.id, lines: [{ orderLineId: line.id, quantity: 1 }], refund: { method: 'EXCHANGE' }, reason: 'Rétractation' });
    expect(noImei.body.code).toBe('SERIALS_REQUIRED');

    const back = await t
      .http()
      .post(`/api/v1/pos/sales/${phoneSale.orderId}/returns`)
      .set(staff())
      .set('Idempotency-Key', randomUUID())
      .send({ sessionId: staffSession.id, lines: [{ orderLineId: line.id, quantity: 1, serials: [IMEIS[0]] }], refund: { method: 'EXCHANGE' }, reason: 'Rétractation' });
    expect(back.status, JSON.stringify(back.body)).toBe(201);
    const again = await t.http().get('/api/v1/pos/lookup').query({ code: IMEIS[0] }).set(staff());
    expect(again.status).toBe(200);
    expect(again.body.serial).toBe(IMEIS[0]);
  });

  it('sort et entre des espèces, sans jamais vider plus que le tiroir', async () => {
    const before = (await session(staffSession.id, staff())).totals.expectedCash;
    const tooMuch = await t
      .http()
      .post(`/api/v1/pos/sessions/${staffSession.id}/movements`)
      .set(staff())
      .send({ type: 'OUT', amount: before + 1, reason: 'Dépôt banque' });
    expect(tooMuch.status).toBe(422);

    const out = await t
      .http()
      .post(`/api/v1/pos/sessions/${staffSession.id}/movements`)
      .set(staff())
      .send({ type: 'OUT', amount: 2_000, reason: 'Achat de sachets' });
    expect(out.status, JSON.stringify(out.body)).toBe(201);
    expect(out.body.totals.expectedCash).toBe(before - 2_000);
    expect(out.body.movements.at(-1)).toMatchObject({ type: 'OUT', amount: 2_000, reason: 'Achat de sachets' });
  });

  it('ferme la caisse : écart compté, récapitulatif par moyen de paiement, plus d’encaissement possible', async () => {
    const detail = await session(staffSession.id, staff());
    const expected = detail.totals.expectedCash;
    expect(detail.totals.byMethod.map((row: { method: string }) => row.method)).toEqual(
      expect.arrayContaining(['CASH', 'MOBILE_MONEY', 'EXCHANGE']),
    );

    const closed = await t
      .http()
      .post(`/api/v1/pos/sessions/${staffSession.id}/close`)
      .set(staff())
      .send({ countedCash: expected - 500, note: 'Pièce de 500 introuvable', version: detail.version });
    expect(closed.status, JSON.stringify(closed.body)).toBe(200);
    expect(closed.body).toMatchObject({ status: 'CLOSED', countedCash: expected - 500, difference: -500, closingNote: 'Pièce de 500 introuvable' });

    const late = await sell(staff(), { sessionId: staffSession.id, lines: [{ variantId: cable.variantId, quantity: 1 }], payments: [{ method: 'CASH', amount: 5_000 }] });
    expect(late.status).toBe(409);
    expect(late.body.code).toBe('POS_SESSION_CLOSED');

    // Un vendeur ne voit que ses caisses ; l'administrateur, toutes.
    const staffList = await t.http().get('/api/v1/pos/sessions').set(staff());
    expect(staffList.body.items.map((item: { id: string }) => item.id)).toEqual([staffSession.id]);
    const ownerList = await t.http().get('/api/v1/pos/sessions').set(owner());
    expect(ownerList.body.items).toHaveLength(2);
    expect((await t.http().get(`/api/v1/pos/sessions/${ownerSession.id}`).set(staff())).status).toBe(404);
  });
});
