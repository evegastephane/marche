import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStoreFor, createTestApp, type TestApp, uniqueSlug } from './support/test-app.js';

describe('Boutique, catalogue et stock (e2e)', () => {
  let t: TestApp;
  let token: string;
  let productId: string;
  let variantIds: string[];

  beforeAll(async () => {
    t = await createTestApp();
    ({ token } = await createStoreFor(t, { slug: uniqueSlug('chez-awa'), currency: 'XOF', country: 'SN' }));
  });

  afterAll(async () => {
    await t?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('refuse un appel sans jeton (401 problem+json)', async () => {
    const response = await t.http().get('/api/v1/stores/current');
    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
  });

  it('refuse un jeton sans boutique active (403 STORE_REQUIRED)', async () => {
    const noOrg = await t.token({ sub: 'user_sans_boutique' });
    const response = await t.http().get('/api/v1/stores/current').set('Authorization', `Bearer ${noOrg}`);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('STORE_REQUIRED');
  });

  it('renvoie la boutique courante', async () => {
    const response = await t.http().get('/api/v1/stores/current').set(auth());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ currency: 'XOF', country: 'SN', timezone: 'Africa/Dakar' });
  });

  it('refuse un slug de boutique déjà pris (409 STORE_SLUG_TAKEN)', async () => {
    const current = await t.http().get('/api/v1/stores/current').set(auth());
    const bootstrap = await t.token({ sub: 'user_autre' });
    const response = await t
      .http()
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${bootstrap}`)
      .send({ name: 'Doublon', slug: current.body.slug, currency: 'EUR', country: 'FR' });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('STORE_SLUG_TAKEN');
  });

  it('crée une marque avec un slug dérivé du nom', async () => {
    const response = await t.http().post('/api/v1/brands').set(auth()).send({ name: 'Wax Élégance' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Wax Élégance', slug: 'wax-elegance', productsCount: 0 });
  });

  it('crée un produit à 2 options (4 variantes) avec stock initial', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(auth())
      .send({
        title: 'Boubou brodé',
        options: [
          { name: 'Taille', values: ['M', 'L'] },
          { name: 'Couleur', values: ['Bleu', 'Or'] },
        ],
        variants: [
          { sku: 'BOU-M-BL', optionValues: ['M', 'Bleu'], priceAmount: 25000, initialQuantity: 5 },
          { sku: 'BOU-M-OR', optionValues: ['M', 'Or'], priceAmount: 25000, initialQuantity: 3 },
          { sku: 'BOU-L-BL', optionValues: ['L', 'Bleu'], priceAmount: 27000, initialQuantity: 0 },
          { sku: 'BOU-L-OR', optionValues: ['L', 'Or'], priceAmount: 27000, trackInventory: false },
        ],
      });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toMatchObject({ title: 'Boubou brodé', slug: 'boubou-brode', status: 'DRAFT', version: 0 });
    expect(response.body.variants).toHaveLength(4);
    expect(response.body.variants[0]).toMatchObject({
      title: 'M / Bleu',
      inventory: { onHand: 5, reserved: 0, available: 5 },
    });
    productId = response.body.id;
    variantIds = response.body.variants.map((variant: { id: string }) => variant.id);
  });

  it('refuse un SKU déjà utilisé (409 SKU_TAKEN)', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(auth())
      .send({ title: 'Autre', variants: [{ sku: 'BOU-M-BL', priceAmount: 1000 }] });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'SKU_TAKEN', details: { skus: ['BOU-M-BL'] } });
  });

  it('refuse une combinaison hors options (422)', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(auth())
      .send({
        title: 'Incohérent',
        options: [{ name: 'Taille', values: ['S'] }],
        variants: [{ sku: 'INC-1', optionValues: ['XL'], priceAmount: 1000 }],
      });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('publie le produit puis le retrouve dans la liste filtrée', async () => {
    const publish = await t.http().post(`/api/v1/products/${productId}/publish`).set(auth());
    expect(publish.status).toBe(200);
    expect(publish.body.status).toBe('ACTIVE');

    const list = await t.http().get('/api/v1/products').query({ status: 'ACTIVE', q: 'boubou' }).set(auth());
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ variantsCount: 4, priceMinAmount: 25000, priceMaxAmount: 27000 });
  });

  it('détecte une modification concurrente (409 CONCURRENT_MODIFICATION)', async () => {
    const current = await t.http().get(`/api/v1/products/${productId}`).set(auth());
    const body = {
      title: 'Boubou brodé main',
      options: current.body.options,
      variants: current.body.variants.map((variant: Record<string, unknown>) => ({
        id: variant.id,
        sku: variant.sku,
        optionValues: variant.optionValues,
        priceAmount: variant.priceAmount,
        trackInventory: variant.trackInventory,
      })),
      version: current.body.version,
    };
    const first = await t.http().put(`/api/v1/products/${productId}`).set(auth()).send(body);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.version).toBe(current.body.version + 1);
    const second = await t.http().put(`/api/v1/products/${productId}`).set(auth()).send(body);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('CONCURRENT_MODIFICATION');
  });

  it('ajuste le stock, refuse de passer sous le réservé et liste les ruptures', async () => {
    const receipt = await t
      .http()
      .post(`/api/v1/inventory/${variantIds[2]}/adjustments`)
      .set(auth())
      .send({ type: 'RECEIPT', quantity: 4 });
    expect(receipt.status, JSON.stringify(receipt.body)).toBe(201);
    expect(receipt.body).toMatchObject({ onHand: 4, available: 4 });

    const loss = await t
      .http()
      .post(`/api/v1/inventory/${variantIds[1]}/adjustments`)
      .set(auth())
      .send({ type: 'LOSS', quantity: 10, reason: 'Casse' });
    expect(loss.status).toBe(409);
    expect(loss.body.code).toBe('STOCK_BELOW_RESERVED');

    const movements = await t.http().get(`/api/v1/inventory/${variantIds[2]}/movements`).set(auth());
    expect(movements.body.items.map((m: { type: string }) => m.type)).toEqual(['RECEIPT']);

    const low = await t.http().get('/api/v1/inventory').query({ filter: 'low' }).set(auth());
    expect(low.status).toBe(200);
    // Seuil par défaut 5 (bas = disponible ≤ seuil), du plus urgent au moins urgent :
    // M/Or (3), L/Bleu (4), M/Bleu (5) ; L/Or ne suit pas le stock.
    expect(low.body.items.map((item: { sku: string }) => item.sku)).toEqual([
      'BOU-M-OR',
      'BOU-L-BL',
      'BOU-M-BL',
    ]);
  });

  it('isole les boutiques : un produit d’une autre boutique est introuvable (404)', async () => {
    const other = await createStoreFor(t, { slug: uniqueSlug('autre') });
    const response = await t.http().get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${other.token}`);
    expect(response.status).toBe(404);
    const list = await t.http().get('/api/v1/products').set('Authorization', `Bearer ${other.token}`);
    expect(list.body.items).toEqual([]);
  });
});
