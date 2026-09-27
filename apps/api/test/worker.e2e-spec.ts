import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPublishedProduct,
  createStoreFor,
  createTestApp,
  createTestWorker,
  eventually,
  STOREFRONT_TOKEN,
  type TestApp,
  type TestWorker,
  uniqueSlug,
} from './support/test-app.js';

describe('Worker : outbox, notifications, revalidation, médias (e2e)', () => {
  let t: TestApp;
  let worker: TestWorker;
  let token: string;
  let slug: string;
  let userId: string;

  const admin = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    worker = await createTestWorker(t);
    slug = uniqueSlug('worker');
    ({ token, userId } = await createStoreFor(t, { slug, name: 'Atelier Worker', currency: 'EUR' }));
  });

  afterAll(async () => {
    await worker?.close();
    await t?.close();
  });

  it('envoie la confirmation à l’acheteur et l’alerte au marchand après une commande', async () => {
    const product = await createPublishedProduct(t, token, { title: 'Bougie', sku: 'BOUGIE-1', priceAmount: 1800, stock: 6 });
    await t.http().post('/api/v1/site/generate').set(admin()).send({});
    const shop = {
      'x-storefront-token': STOREFRONT_TOKEN,
      'x-store-host': slug,
      'x-client-ip': randomUUID(),
    };
    const cart = await t.http().post('/storefront/v1/carts').set(shop);
    await t.http().post(`/storefront/v1/carts/${cart.body.id}/lines`).set(shop).send({ variantId: product.variantId, quantity: 2 });
    const order = await t
      .http()
      .post('/storefront/v1/checkout')
      .set({ ...shop, 'idempotency-key': randomUUID() })
      .send({
        cartId: cart.body.id,
        email: 'client@example.com',
        shippingAddress: { firstName: 'Léa', lastName: 'Martin', line1: '1 rue de Paris', city: 'Lyon', country: 'FR' },
      });
    expect(order.status, JSON.stringify(order.body)).toBe(201);

    const confirmation = await eventually(() => worker.emails.sent.find((e) => e.to.includes('client@example.com')));
    expect(confirmation.subject).toBe(`Atelier Worker : commande #${order.body.orderNumber} confirmée`);
    expect(confirmation.html).toContain(`https://${slug}.marche.test/orders/${order.body.publicToken}`);
    expect(confirmation.idempotencyKey).toMatch(/-order-confirmation$/);

    // Destinataire marchand : l'e-mail du propriétaire (annuaire simulé).
    const merchant = await eventually(() => worker.emails.sent.find((e) => e.to.includes(`${userId}@example.test`)));
    expect(merchant.subject).toMatch(/^Nouvelle commande #\d+ : 36,00/);
  });

  it('demande au storefront de revalider les pages touchées', async () => {
    const product = await createPublishedProduct(t, token, { title: 'Vase', sku: 'VASE-1', priceAmount: 2500, stock: 3 });
    await eventually(() => worker.revalidator.tags().includes(`product:${product.productId}`));
    const themePublish = await eventually(() => worker.revalidator.calls.find((call) => call.tags.includes(`site:${slug}`)));
    expect(themePublish.immediate).toBe(true);
  });

  it('alerte le marchand quand un stock passe sous le seuil', async () => {
    const product = await createPublishedProduct(t, token, { title: 'Tapis', sku: 'TAPIS-1', priceAmount: 9900, stock: 8 });
    await t
      .http()
      .post(`/api/v1/inventory/${product.variantId}/adjustments`)
      .set(admin())
      .send({ type: 'LOSS', quantity: 4, reason: 'Humidité' });
    const alert = await eventually(() => worker.emails.sent.find((e) => e.subject === 'Stock bas : Tapis'));
    expect(alert.text).toContain('n’a plus que 4 unités');
  });

  it('génère les déclinaisons webp d’une image téléversée', async () => {
    const image = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#cc8844' } }).jpeg().toBuffer();
    const ticket = await t
      .http()
      .post('/api/v1/media/upload-url')
      .set(admin())
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg', sizeBytes: image.length, alt: 'Photo' });
    expect(ticket.status, JSON.stringify(ticket.body)).toBe(201);
    expect(ticket.body).toMatchObject({ method: 'PUT', media: { status: 'PENDING' } });

    const notUploaded = await t.http().post(`/api/v1/media/${ticket.body.media.id}/complete`).set(admin());
    expect(notUploaded.status).toBe(422);
    expect(notUploaded.body.code).toBe('MEDIA_NOT_UPLOADED');

    const key = new URL(ticket.body.uploadUrl).pathname.slice(1);
    t.storage.simulateUpload(key, image, 'image/jpeg');
    const completed = await t.http().post(`/api/v1/media/${ticket.body.media.id}/complete`).set(admin());
    expect(completed.status).toBe(200);

    const ready = await eventually(async () => {
      const media = await t.http().get(`/api/v1/media/${ticket.body.media.id}`).set(admin());
      return media.body.status === 'READY' ? media.body : null;
    });
    expect(ready).toMatchObject({ width: 1200, height: 800 });
    expect(Object.keys(ready.renditions).sort()).toEqual(['1200', '400', '800']);
  });
});
