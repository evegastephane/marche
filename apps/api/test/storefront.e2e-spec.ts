import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPublishedProduct,
  createStoreFor,
  createTestApp,
  STOREFRONT_TOKEN,
  type TestApp,
  uniqueSlug,
} from './support/test-app.js';

describe('Génération du site et parcours acheteur (e2e)', () => {
  let t: TestApp;
  let token: string;
  let slug: string;
  let robe: { productId: string; variantId: string; slug: string };
  let sac: { productId: string; variantId: string; slug: string };

  const admin = () => ({ Authorization: `Bearer ${token}` });
  const shop = (extra: Record<string, string> = {}) => ({
    'x-storefront-token': STOREFRONT_TOKEN,
    'x-store-host': `${slug}.marche.test`,
    'x-client-ip': randomUUID(),
    ...extra,
  });
  const address = { firstName: 'Awa', lastName: 'Diop', line1: '12 rue des Almadies', city: 'Dakar', country: 'SN' };

  async function cartWith(variantId: string, quantity: number): Promise<string> {
    const cart = await t.http().post('/storefront/v1/carts').set(shop());
    expect(cart.status).toBe(201);
    const added = await t.http().post(`/storefront/v1/carts/${cart.body.id}/lines`).set(shop()).send({ variantId, quantity });
    expect(added.status, JSON.stringify(added.body)).toBe(201);
    return cart.body.id as string;
  }

  const checkout = (cartId: string) =>
    t
      .http()
      .post('/storefront/v1/checkout')
      .set(shop({ 'idempotency-key': randomUUID() }))
      .send({ cartId, email: 'Acheteur@Example.com', phone: '+221770000000', shippingAddress: address });

  beforeAll(async () => {
    t = await createTestApp();
    slug = uniqueSlug('boutique');
    ({ token } = await createStoreFor(t, { slug, name: 'Chez Awa', currency: 'EUR', country: 'FR' }));
    robe = await createPublishedProduct(t, token, { title: 'Robe lin', sku: 'ROBE-1', priceAmount: 4990, stock: 10 });
    sac = await createPublishedProduct(t, token, { title: 'Sac cuir', sku: 'SAC-1', priceAmount: 12900, stock: 1 });
    const collection = await t.http().post('/api/v1/collections').set(admin()).send({ title: 'Été 2026' });
    await t
      .http()
      .put(`/api/v1/collections/${collection.body.id}/products`)
      .set(admin())
      .send({ productIds: [sac.productId, robe.productId] });
  });

  afterAll(async () => {
    await t?.close();
  });

  it('refuse le storefront tant que le site n’est pas généré (404), puis le génère en un clic', async () => {
    const before = await t.http().get('/storefront/v1/store').set(shop());
    expect(before.status).toBe(404);

    const generated = await t.http().post('/api/v1/site/generate').set(admin()).send({});
    expect(generated.status, JSON.stringify(generated.body)).toBe(201);
    expect(generated.body).toMatchObject({
      subdomain: slug,
      url: `https://${slug}.marche.test`,
      status: 'PUBLISHED',
      templateId: 'default',
      hasUnpublishedChanges: false,
    });
    const featured = generated.body.themeSettings.sections.find((s: { type: string }) => s.type === 'featured-collection');
    expect(featured).toMatchObject({ enabled: true, title: 'Été 2026' });
    const hero = generated.body.themeSettings.sections.find((s: { type: string }) => s.type === 'hero');
    expect(hero.title).toBe('Bienvenue chez Awa');

    // Idempotent : un second clic renvoie le même site.
    const again = await t.http().post('/api/v1/site/generate').set(admin()).send({});
    expect(again.body.id).toBe(generated.body.id);
  });

  it('protège l’API storefront (jeton et hôte)', async () => {
    const badToken = await t.http().get('/storefront/v1/store').set({ ...shop(), 'x-storefront-token': 'mauvais-jeton' });
    expect(badToken.status).toBe(401);
    const unknownHost = await t.http().get('/storefront/v1/store').set({ ...shop(), 'x-store-host': 'inconnue.marche.test' });
    expect(unknownHost.status).toBe(404);
  });

  it('sert la boutique, sa navigation et son catalogue publié', async () => {
    const store = await t.http().get('/storefront/v1/store').set(shop());
    expect(store.status).toBe(200);
    expect(store.body).toMatchObject({
      name: 'Chez Awa',
      currency: 'EUR',
      hasProducts: true,
      preview: false,
      navigation: { collections: [{ title: 'Été 2026', slug: 'ete-2026' }] },
    });

    const featured = await t.http().get('/storefront/v1/products').query({ collection: 'ete-2026' }).set(shop());
    expect(featured.body.items.map((p: { slug: string }) => p.slug)).toEqual([sac.slug, robe.slug]);

    const cheapest = await t.http().get('/storefront/v1/products').query({ sort: 'price-asc', limit: 1 }).set(shop());
    expect(cheapest.body.items[0]).toMatchObject({ slug: robe.slug, priceMinAmount: 4990 });
    expect(cheapest.body.nextCursor).toBeTruthy();
    const next = await t
      .http()
      .get('/storefront/v1/products')
      .query({ sort: 'price-asc', limit: 1, cursor: cheapest.body.nextCursor })
      .set(shop());
    expect(next.body.items[0].slug).toBe(sac.slug);

    const product = await t.http().get(`/storefront/v1/products/${robe.slug}`).set(shop());
    expect(product.body).toMatchObject({ title: 'Robe lin', variants: [{ sku: 'ROBE-1', priceAmount: 4990 }] });

    const missing = await t.http().get('/storefront/v1/products').query({ collection: 'inexistant' }).set(shop());
    expect(missing.status).toBe(404);
  });

  it('passe une commande invitée : panier → checkout → confirmation, stock réservé', async () => {
    const cartId = await cartWith(robe.variantId, 2);
    const cart = await t.http().get(`/storefront/v1/carts/${cartId}`).set(shop());
    expect(cart.body).toMatchObject({ currency: 'EUR', itemsCount: 2, subtotalAmount: 9980, totalAmount: 9980 });
    expect(cart.body.lines[0]).toMatchObject({ productTitle: 'Robe lin', available: 10, isSellable: true });

    const result = await checkout(cartId);
    expect(result.status, JSON.stringify(result.body)).toBe(201);
    expect(result.body).toMatchObject({ orderNumber: 1001, totalAmount: 9980, currency: 'EUR' });

    const confirmation = await t.http().get(`/storefront/v1/orders/${result.body.publicToken}`).set(shop());
    expect(confirmation.body).toMatchObject({ number: 1001, status: 'PLACED', shippingCity: 'Dakar' });

    const gone = await t.http().get(`/storefront/v1/carts/${cartId}`).set(shop());
    expect(gone.status).toBe(404);

    const order = await t.http().get('/api/v1/orders').query({ q: '1001' }).set(admin());
    expect(order.body.items[0]).toMatchObject({ source: 'STOREFRONT', email: 'acheteur@example.com' });
    const availability = await t.http().get('/storefront/v1/availability').query({ variantIds: robe.variantId }).set(shop());
    expect(availability.body.variants[0]).toEqual({ variantId: robe.variantId, available: 8 });
  });

  it('signale un prix modifié entre-temps (409 CART_CHANGED) et met le panier à jour', async () => {
    const cartId = await cartWith(robe.variantId, 1);
    const current = await t.http().get(`/api/v1/products/${robe.productId}`).set(admin());
    await t
      .http()
      .put(`/api/v1/products/${robe.productId}`)
      .set(admin())
      .send({
        title: current.body.title,
        options: [],
        variants: [{ id: robe.variantId, sku: 'ROBE-1', priceAmount: 5490, trackInventory: true }],
        version: current.body.version,
      });

    const refused = await checkout(cartId);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      code: 'CART_CHANGED',
      details: { changes: [{ variantId: robe.variantId, reason: 'PRICE_CHANGED', previousPriceAmount: 4990, currentPriceAmount: 5490 }] },
    });
    const accepted = await checkout(cartId);
    expect(accepted.status).toBe(201);
    expect(accepted.body.totalAmount).toBe(5490);
  });

  it('ramène la quantité au stock disponible (INSUFFICIENT_STOCK)', async () => {
    const cartId = await cartWith(sac.variantId, 3);
    const refused = await checkout(cartId);
    expect(refused.status).toBe(409);
    expect(refused.body.details.changes).toEqual([{ variantId: sac.variantId, reason: 'INSUFFICIENT_STOCK', available: 1 }]);
    const cart = await t.http().get(`/storefront/v1/carts/${cartId}`).set(shop());
    expect(cart.body.lines[0].quantity).toBe(1);
  });

  it('édite le thème en brouillon, le prévisualise puis le publie', async () => {
    const site = await t.http().get('/api/v1/site').set(admin());
    const invalid = await t.http().put('/api/v1/site/theme').set(admin()).send({ settings: { colors: 'rouge' } });
    expect(invalid.status).toBe(422);

    const draft = structuredClone(site.body.draftThemeSettings);
    draft.colors.primary = '#AA0000';
    draft.announcement = { enabled: true, text: 'Livraison offerte dès 50 €' };
    const updated = await t.http().put('/api/v1/site/theme').set(admin()).send({ settings: draft });
    expect(updated.status).toBe(200);
    expect(updated.body.hasUnpublishedChanges).toBe(true);

    const live = await t.http().get('/storefront/v1/store').set(shop());
    expect(live.body.theme.colors.primary).not.toBe('#AA0000');

    const preview = await t.http().post('/api/v1/site/preview-token').set(admin());
    expect(preview.body.previewUrl).toContain(`https://${slug}.marche.test/preview?token=`);
    const previewed = await t.http().get('/storefront/v1/store').set(shop({ 'x-preview-token': preview.body.token }));
    expect(previewed.body).toMatchObject({ preview: true, theme: { colors: { primary: '#AA0000' } } });

    const published = await t.http().post('/api/v1/site/theme/publish').set(admin());
    expect(published.body.hasUnpublishedChanges).toBe(false);
    const after = await t.http().get('/storefront/v1/store').set(shop());
    expect(after.body.theme.announcement.text).toBe('Livraison offerte dès 50 €');
  });

  it('met le site hors ligne : 404 pour les visiteurs, aperçu possible mais sans commande', async () => {
    const unpublished = await t.http().post('/api/v1/site/unpublish').set(admin());
    expect(unpublished.body.status).toBe('UNPUBLISHED');
    expect((await t.http().get('/storefront/v1/store').set(shop())).status).toBe(404);

    const preview = await t.http().post('/api/v1/site/preview-token').set(admin());
    const headers = shop({ 'x-preview-token': preview.body.token });
    expect((await t.http().get('/storefront/v1/store').set(headers)).status).toBe(200);

    const cart = await t.http().post('/storefront/v1/carts').set(headers);
    await t.http().post(`/storefront/v1/carts/${cart.body.id}/lines`).set(headers).send({ variantId: robe.variantId, quantity: 1 });
    const refused = await t
      .http()
      .post('/storefront/v1/checkout')
      .set({ ...headers, 'idempotency-key': randomUUID() })
      .send({ cartId: cart.body.id, email: 'x@example.com', shippingAddress: address });
    expect(refused.status).toBe(409);

    await t.http().post('/api/v1/site/publish').set(admin());
    expect((await t.http().get('/storefront/v1/store').set(shop())).status).toBe(200);
  });
});
