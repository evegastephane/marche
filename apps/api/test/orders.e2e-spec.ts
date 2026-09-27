import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPublishedProduct,
  createStoreFor,
  createTestApp,
  type TestApp,
  uniqueSlug,
} from './support/test-app.js';

describe('Commandes et clients (e2e)', () => {
  let t: TestApp;
  let token: string;
  let userId: string;
  let tracked: { variantId: string; productId: string };
  let untracked: { variantId: string };

  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function stockOf(productId: string) {
    const product = await t.http().get(`/api/v1/products/${productId}`).set(auth());
    return product.body.variants[0].inventory as { onHand: number; reserved: number; available: number };
  }

  async function draft(lines: { variantId: string; quantity: number }[], email = 'awa@example.com') {
    const response = await t
      .http()
      .post('/api/v1/orders')
      .set(auth())
      .send({
        customer: { email, firstName: 'Awa', lastName: 'Diop' },
        lines,
        shippingAddress: { firstName: 'Awa', lastName: 'Diop', line1: '12 rue des Almadies', city: 'Dakar', country: 'SN' },
      });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body as { id: string; version: number };
  }

  const place = (orderId: string, key: string = randomUUID()) =>
    t.http().post(`/api/v1/orders/${orderId}/place`).set(auth()).set('Idempotency-Key', key);

  beforeAll(async () => {
    t = await createTestApp();
    ({ token, userId } = await createStoreFor(t, { slug: uniqueSlug('cmd'), currency: 'XOF', country: 'SN' }));
    await t
      .http()
      .patch('/api/v1/stores/current')
      .set(auth())
      .send({ shippingSettings: { strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 1500, thresholdAmount: 50000 } });
    tracked = await createPublishedProduct(t, token, { title: 'Pagne wax', sku: 'WAX-1', priceAmount: 10000, stock: 5 });
    untracked = await createPublishedProduct(t, token, {
      title: 'Carte cadeau',
      sku: 'GIFT-1',
      priceAmount: 5000,
      trackInventory: false,
    });
  });

  afterAll(async () => {
    await t?.close();
  });

  it('crée un brouillon avec totaux et frais de livraison (stratégie de la boutique)', async () => {
    const order = await draft([{ variantId: tracked.variantId, quantity: 2 }]);
    const response = await t.http().get(`/api/v1/orders/${order.id}`).set(auth());
    expect(response.body).toMatchObject({
      status: 'DRAFT',
      number: null,
      currency: 'XOF',
      subtotalAmount: 20000,
      shippingAmount: 1500,
      totalAmount: 21500,
      shippingMethod: 'FREE_OVER_THRESHOLD',
      customer: { email: 'awa@example.com', firstName: 'Awa' },
    });
    expect(response.body.lines[0]).toMatchObject({ productTitle: 'Pagne wax', sku: 'WAX-1', quantity: 2, lineTotalAmount: 20000 });
  });

  it('passe la commande une seule fois malgré un double envoi (Idempotency-Key)', async () => {
    const order = await draft([
      { variantId: tracked.variantId, quantity: 2 },
      { variantId: untracked.variantId, quantity: 1 },
    ]);
    const key = randomUUID();
    const first = await place(order.id, key);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body).toMatchObject({ status: 'PLACED', number: 1001, totalAmount: 26500 });

    const replay = await place(order.id, key);
    expect(replay.status).toBe(200);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.number).toBe(1001);

    // Seule la variante suivie réserve du stock.
    expect(await stockOf(tracked.productId)).toEqual({ onHand: 5, reserved: 2, available: 3 });
  });

  it('exige une clé d’idempotence pour passer une commande', async () => {
    const order = await draft([{ variantId: tracked.variantId, quantity: 1 }]);
    const response = await t.http().post(`/api/v1/orders/${order.id}/place`).set(auth());
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('refuse une transition invalide (409 INVALID_ORDER_TRANSITION)', async () => {
    const order = await draft([{ variantId: tracked.variantId, quantity: 1 }]);
    const response = await t.http().post(`/api/v1/orders/${order.id}/fulfill`).set(auth());
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INVALID_ORDER_TRANSITION');
  });

  it('encaisse puis expédie : le stock réservé est consommé', async () => {
    const order = await draft([{ variantId: tracked.variantId, quantity: 1 }]);
    const placed = await place(order.id);
    expect(placed.body.number).toBe(1002);
    const before = await stockOf(tracked.productId);

    const paid = await t.http().post(`/api/v1/orders/${order.id}/mark-paid`).set(auth());
    expect(paid.body).toMatchObject({ paymentStatus: 'PAID' });
    const fulfilled = await t.http().post(`/api/v1/orders/${order.id}/fulfill`).set(auth());
    expect(fulfilled.status).toBe(200);
    expect(fulfilled.body).toMatchObject({ status: 'FULFILLED', paymentStatus: 'PAID' });

    expect(await stockOf(tracked.productId)).toEqual({
      onHand: before.onHand - 1,
      reserved: before.reserved - 1,
      available: before.available,
    });
  });

  it('annule une commande passée : la réservation est libérée', async () => {
    const order = await draft([{ variantId: tracked.variantId, quantity: 1 }]);
    await place(order.id);
    const reserved = (await stockOf(tracked.productId)).reserved;
    const cancelled = await t.http().post(`/api/v1/orders/${order.id}/cancel`).set(auth()).send({ reason: 'Client injoignable' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ status: 'CANCELLED', cancelReason: 'Client injoignable' });
    expect((await stockOf(tracked.productId)).reserved).toBe(reserved - 1);
  });

  it('refuse de passer une commande sans stock suffisant et ne réserve rien (R5)', async () => {
    const before = await stockOf(tracked.productId);
    const order = await draft([
      { variantId: untracked.variantId, quantity: 1 },
      { variantId: tracked.variantId, quantity: before.available + 1 },
    ]);
    const response = await place(order.id);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      details: { lines: [{ variantId: tracked.variantId, requested: before.available + 1, available: before.available }] },
    });
    expect(await stockOf(tracked.productId)).toEqual(before);
    const reloaded = await t.http().get(`/api/v1/orders/${order.id}`).set(auth());
    expect(reloaded.body.status).toBe('DRAFT');
  });

  it('réserve les actions sensibles aux administrateurs (403 FORBIDDEN)', async () => {
    const staff = await t.token({ sub: `staff_${randomUUID()}`, orgId: t.organizations.orgIdFor((await t.http().get('/api/v1/stores/current').set(auth())).body.slug), orgRole: 'member' });
    const order = await draft([{ variantId: tracked.variantId, quantity: 1 }]);
    await place(order.id);
    const response = await t
      .http()
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${staff}`)
      .send({ reason: 'Test' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('liste les commandes filtrées et les clients avec leurs statistiques', async () => {
    const placed = await t.http().get('/api/v1/orders').query({ status: 'FULFILLED' }).set(auth());
    expect(placed.body.items.map((o: { number: number }) => o.number)).toEqual([1002]);

    const byNumber = await t.http().get('/api/v1/orders').query({ q: '#1001' }).set(auth());
    expect(byNumber.body.items).toHaveLength(1);

    const customers = await t.http().get('/api/v1/customers').set(auth());
    expect(customers.body.items).toHaveLength(1);
    expect(customers.body.items[0]).toMatchObject({ email: 'awa@example.com', firstName: 'Awa' });
    expect(customers.body.items[0].ordersCount).toBeGreaterThanOrEqual(2);

    const detail = await t.http().get(`/api/v1/customers/${customers.body.items[0].id}`).set(auth());
    expect(detail.body.orders.length).toBeGreaterThanOrEqual(2);
  });

  it('calcule les indicateurs du tableau de bord', async () => {
    const response = await t.http().get('/api/v1/reporting/overview').query({ period: '7d' }).set(auth());
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toMatchObject({ period: '7d', currency: 'XOF' });
    expect(response.body.ordersCount).toBeGreaterThanOrEqual(3);
    expect(response.body.revenueAmount).toBeGreaterThan(0);
    expect(response.body.daily).toHaveLength(7);
    expect(response.body.topProducts[0]).toMatchObject({ productId: tracked.productId, title: 'Pagne wax' });
    expect(userId).toBeTruthy();
  });
});
