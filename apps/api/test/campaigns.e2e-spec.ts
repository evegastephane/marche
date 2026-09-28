import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CampaignUseCases } from '../src/modules/campaigns/application/campaign.use-cases.js';
import { TenantContext } from '../src/shared/infrastructure/cls/tenant-context.js';
import {
  createPublishedProduct,
  createStoreFor,
  createTestApp,
  STOREFRONT_TOKEN,
  type TestApp,
  uniqueSlug,
} from './support/test-app.js';

describe('Campagnes WhatsApp : consentement, envoi, statuts, « STOP » (e2e)', () => {
  let t: TestApp;
  let token: string;
  let storeId: string;
  let slug: string;
  let boubou: { productId: string; variantId: string; slug: string };

  const admin = () => ({ Authorization: `Bearer ${token}` });
  const shop = (extra: Record<string, string> = {}) => ({
    'x-storefront-token': STOREFRONT_TOKEN,
    'x-store-host': `${slug}.marche.test`,
    'x-client-ip': randomUUID(),
    ...extra,
  });
  const address = { firstName: 'Awa', lastName: 'Diop', line1: 'Rue 10, Almadies', city: 'Dakar', country: 'SN' };

  async function buy(email: string, whatsappOptIn: boolean): Promise<void> {
    const cart = await t.http().post('/storefront/v1/carts').set(shop());
    await t.http().post(`/storefront/v1/carts/${cart.body.id}/lines`).set(shop()).send({ variantId: boubou.variantId, quantity: 1 });
    const placed = await t
      .http()
      .post('/storefront/v1/checkout')
      .set(shop({ 'idempotency-key': randomUUID() }))
      .send({ cartId: cart.body.id, email, phone: '77 000 00 00', shippingAddress: address, whatsappOptIn });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
  }

  const notify = (value: object) => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value }] }] });
    const signature = `sha256=${createHmac('sha256', t.config.whatsapp.appSecret as string).update(body).digest('hex')}`;
    return t.http().post('/webhooks/whatsapp').set({ 'content-type': 'application/json', 'x-hub-signature-256': signature }).send(body);
  };

  beforeAll(async () => {
    t = await createTestApp();
    slug = uniqueSlug('campagne');
    ({ token, storeId } = await createStoreFor(t, { slug, name: 'Chez Awa', currency: 'XOF', country: 'SN' }));
    boubou = await createPublishedProduct(t, token, { title: 'Boubou brodé', sku: 'BOU-1', priceAmount: 25000, stock: 20 });
    await t.http().post('/api/v1/site/generate').set(admin()).send({});
  });

  afterAll(async () => {
    await t?.close();
  });

  it('refuse de lancer une campagne tant qu’aucun client n’a accepté (409)', async () => {
    const response = await t.http().post('/api/v1/campaigns').set(admin()).send({ productId: boubou.productId });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('NO_RECIPIENTS');
  });

  it('enregistre le consentement coché au paiement, et seulement lui', async () => {
    await buy('awa@example.com', true);
    await buy('fatou@example.com', false);
    const audience = await t.http().get('/api/v1/campaigns/audience').set(admin());
    expect(audience.body).toEqual({ configured: true, recipients: 1, templateName: 'nouveau_produit' });

    const customers = await t.http().get('/api/v1/customers').set(admin());
    const awa = customers.body.items.find((c: { email: string }) => c.email === 'awa@example.com');
    expect(awa.whatsappOptInAt).not.toBeNull();
  });

  it('lance la campagne, puis le worker envoie le produit avec son prix et son lien', async () => {
    const launched = await t.http().post('/api/v1/campaigns').set(admin()).send({ productId: boubou.productId });
    expect(launched.status, JSON.stringify(launched.body)).toBe(201);
    expect(launched.body).toMatchObject({ productTitle: 'Boubou brodé', status: 'SENDING', counts: { total: 1, queued: 1 } });

    const campaigns = t.moduleRef.get(CampaignUseCases);
    await t.moduleRef.get(TenantContext).runForStore(storeId, () => campaigns.send(launched.body.id));

    const [message] = t.whatsapp.sent;
    expect(message?.to).toBe('221770000000');
    expect(message?.bodyParams[0]).toBe('Awa');
    expect(message?.bodyParams[1]).toBe('Chez Awa');
    expect(message?.bodyParams[2]).toBe('Boubou brodé');
    expect(message?.bodyParams[3]).toMatch(/25\s000/);
    expect(message?.bodyParams[4]).toBe(`https://${slug}.marche.test/products/${boubou.slug}`);

    const list = await t.http().get('/api/v1/campaigns').set(admin());
    expect(list.body[0]).toMatchObject({ status: 'DONE', counts: { total: 1, sent: 1, queued: 0 } });
  });

  it('suit les statuts envoyés par Meta, sans jamais reculer', async () => {
    const at = String(Math.floor(Date.now() / 1000));
    expect((await notify({ statuses: [{ id: 'wamid.test.1', status: 'read', timestamp: at }] })).status).toBe(200);
    expect((await notify({ statuses: [{ id: 'wamid.test.1', status: 'delivered', timestamp: at }] })).status).toBe(200);
    const list = await t.http().get('/api/v1/campaigns').set(admin());
    expect(list.body[0].counts).toMatchObject({ sent: 1, delivered: 1, read: 1 });
  });

  it('désinscrit le client qui répond « STOP »', async () => {
    const response = await notify({ messages: [{ from: '221770000000', type: 'text', text: { body: 'Stop' } }] });
    expect(response.status).toBe(200);
    const audience = await t.http().get('/api/v1/campaigns/audience').set(admin());
    expect(audience.body.recipients).toBe(0);
  });
});
