import { randomUUID } from 'node:crypto';
import { Webhook } from 'svix';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPublishedProduct,
  createStoreFor,
  createTestApp,
  type TestApp,
  uniqueSlug,
} from './support/test-app.js';

describe('Intégrité : concurrence du stock et webhooks Clerk (e2e)', () => {
  let t: TestApp;
  let token: string;

  beforeAll(async () => {
    t = await createTestApp();
    ({ token } = await createStoreFor(t, { slug: uniqueSlug('integrite') }));
  });

  afterAll(async () => {
    await t?.close();
  });

  it('ne survend jamais : 25 commandes simultanées sur un stock de 10 (R4, R5, R8)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const product = await createPublishedProduct(t, token, { title: 'Édition limitée', sku: 'LIM-1', priceAmount: 1000, stock: 10 });

    const drafts = await Promise.all(
      Array.from({ length: 25 }, () =>
        t
          .http()
          .post('/api/v1/orders')
          .set(auth)
          .send({ lines: [{ variantId: product.variantId, quantity: 1 }] }),
      ),
    );
    const results = await Promise.all(
      drafts.map((draft) =>
        t.http().post(`/api/v1/orders/${draft.body.id}/place`).set(auth).set('Idempotency-Key', randomUUID()),
      ),
    );

    const placed = results.filter((r) => r.status === 200);
    const refused = results.filter((r) => r.status === 409);
    expect(placed).toHaveLength(10);
    expect(refused).toHaveLength(15);
    expect(refused.every((r) => r.body.code === 'INSUFFICIENT_STOCK')).toBe(true);
    // Numéros uniques et consécutifs, aucun trou dû aux transactions annulées.
    expect(placed.map((r) => r.body.number as number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 10 }, (_, i) => 1001 + i),
    );

    const stock = await t.http().get(`/api/v1/products/${product.productId}`).set(auth);
    expect(stock.body.variants[0].inventory).toEqual({ onHand: 10, reserved: 10, available: 0 });
  });

  describe('webhooks Clerk', () => {
    const send = (payload: object, secret = t.config.clerk.webhookSigningSecret as string) => {
      const body = JSON.stringify(payload);
      const id = `msg_${randomUUID()}`;
      const timestamp = new Date();
      const signature = new Webhook(secret).sign(id, timestamp, body);
      return t
        .http()
        .post('/webhooks/clerk')
        .set({
          'content-type': 'application/json',
          'svix-id': id,
          'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
          'svix-signature': signature,
        })
        .send(body);
    };

    it('synchronise un utilisateur depuis un webhook signé', async () => {
      const response = await send({
        type: 'user.created',
        data: {
          id: 'user_webhook_1',
          email_addresses: [{ id: 'e1', email_address: 'Webhook@Example.com' }],
          primary_email_address_id: 'e1',
          first_name: 'Fatou',
          last_name: 'Sow',
        },
      });
      expect(response.status).toBe(204);
    });

    it('refuse une signature invalide (400)', async () => {
      const response = await send({ type: 'user.created', data: { id: 'x' } }, `whsec_${Buffer.from('autre-secret-32-octets-minimum!!').toString('base64')}`);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_SIGNATURE');
    });

    it('archive la boutique quand son organisation est supprimée', async () => {
      const other = await createStoreFor(t, { slug: uniqueSlug('supprimee') });
      const current = await t.http().get('/api/v1/stores/current').set('Authorization', `Bearer ${other.token}`);
      const orgId = t.organizations.orgIdFor(current.body.slug);
      expect((await send({ type: 'organization.deleted', data: { id: orgId } })).status).toBe(204);
      const after = await t.http().get('/api/v1/stores/current').set('Authorization', `Bearer ${other.token}`);
      expect(after.status).toBe(403);
      expect(after.body.code).toBe('STORE_REQUIRED');
    });
  });
});
