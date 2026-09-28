import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStoreFor, createTestApp, STOREFRONT_TOKEN, type TestApp, uniqueSlug } from './support/test-app.js';

describe('Types de boutique : électronique, accessoires, packs, demandes (e2e)', () => {
  let t: TestApp;
  let token: string;
  let slug: string;
  let phone: { id: string; slug: string; variants: { id: string; optionValues: string[] }[] };
  let charger: { id: string; variantId: string };
  let case12: { id: string; variantId: string };
  let earphones: { id: string; variantId: string };

  const admin = () => ({ Authorization: `Bearer ${token}` });
  const shop = (extra: Record<string, string> = {}) => ({
    'x-storefront-token': STOREFRONT_TOKEN,
    'x-store-host': `${slug}.marche.test`,
    'x-client-ip': randomUUID(),
    ...extra,
  });

  async function publishedProduct(body: Record<string, unknown>) {
    const created = await t.http().post('/api/v1/products').set(admin()).send(body);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const published = await t.http().post(`/api/v1/products/${created.body.id}/publish`).set(admin());
    expect(published.status, JSON.stringify(published.body)).toBe(200);
    return created.body;
  }

  const accessory = async (title: string, sku: string, priceAmount: number, attributes: Record<string, unknown>) => {
    const body = await publishedProduct({
      title,
      kind: 'ACCESSORY',
      attributes,
      variants: [{ sku, priceAmount, initialQuantity: 20 }],
    });
    return { id: body.id as string, variantId: body.variants[0].id as string };
  };

  beforeAll(async () => {
    t = await createTestApp();
    slug = uniqueSlug('volta');
    ({ token } = await createStoreFor(t, { slug, name: 'Volta Mobile', currency: 'XOF', country: 'SN', type: 'ELECTRONICS' }));

    charger = await accessory('Chargeur 20 W', 'CHG-20', 15_000, {
      accessoryType: 'CHARGER',
      compatibleModels: ['iPhone 12', 'iPhone 13'],
      power: 20,
    });
    case12 = await accessory('Coque silicone', 'COQ-12', 8_000, { accessoryType: 'CASE', compatibleModels: ['iphone  12'] });
    earphones = await accessory('Écouteurs sans fil', 'ECO-1', 25_000, { accessoryType: 'EARPHONES', wireless: true });

    phone = await publishedProduct({
      title: 'iPhone 12',
      kind: 'PHONE',
      attributes: { model: 'iPhone 12', screenSize: 6.1, network5g: true },
      options: [
        { name: 'Stockage', type: 'storage', values: ['128 Go', '256 Go'] },
        { name: 'Couleur', type: 'color', values: ['Bleu', 'Violet'], swatches: { Violet: '#6A4C93' } },
        { name: 'État', type: 'condition', values: ['Neuf', 'Reconditionné – Excellent'] },
      ],
      variants: [
        { sku: 'IP12-128-BL-N', optionValues: ['128 Go', 'Bleu', 'Neuf'], priceAmount: 300_000, initialQuantity: 3 },
        { sku: 'IP12-256-BL-N', optionValues: ['256 Go', 'Bleu', 'Neuf'], priceAmount: 350_000, initialQuantity: 1 },
        {
          sku: 'IP12-128-VI-R',
          optionValues: ['128 Go', 'Violet', 'Reconditionné – Excellent'],
          priceAmount: 240_000,
          initialQuantity: 2,
        },
      ],
      accessoryIds: [earphones.id],
    });

    const generated = await t.http().post('/api/v1/site/generate').set(admin()).send({});
    expect(generated.status, JSON.stringify(generated.body)).toBe(201);
  });

  afterAll(async () => {
    await t?.close();
  });

  it('expose le type de la boutique et ses guides des tailles au site', async () => {
    const store = await t.http().get('/storefront/v1/store').set(shop());
    expect(store.body.type).toBe('ELECTRONICS');
    expect(store.body.sizeGuides.CLOTHING.columns.length).toBeGreaterThan(1);
  });

  it('refuse une sorte d’article d’un autre type de boutique', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({ title: 'Robe', kind: 'CLOTHING', variants: [{ sku: 'ROBE-X', priceAmount: 1000 }] });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INVALID_PRODUCT_KIND');
  });

  it('valide la fiche technique selon la sorte d’article', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({ title: 'Chargeur', kind: 'ACCESSORY', attributes: { accessoryType: 'TELEPORTEUR' }, variants: [{ sku: 'X-1', priceAmount: 1 }] });
    expect(response.status).toBe(422);
  });

  it('garde les options typées, les pastilles et la fiche technique', async () => {
    const product = await t.http().get(`/api/v1/products/${phone.id}`).set(admin());
    expect(product.body).toMatchObject({
      kind: 'PHONE',
      attributes: { model: 'iPhone 12', screenSize: 6.1, network5g: true },
      accessories: [{ id: earphones.id, title: 'Écouteurs sans fil' }],
    });
    expect(product.body.options[1]).toMatchObject({ type: 'color', swatches: { Violet: '#6A4C93' } });
  });

  it('propose les accessoires choisis, puis les compatibles avec le modèle', async () => {
    const product = await t.http().get(`/storefront/v1/products/${phone.slug}`).set(shop());
    expect(product.status).toBe(200);
    expect(product.body.kind).toBe('PHONE');
    const ids = product.body.accessories.map((a: { id: string }) => a.id);
    expect(ids[0]).toBe(earphones.id);
    expect(ids).toEqual(expect.arrayContaining([charger.id, case12.id]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(product.body.accessories[0]).toMatchObject({ variantId: earphones.variantId, attributes: { wireless: true } });
  });

  it('filtre le catalogue par option, attribut et prix, avec les compteurs', async () => {
    const list = (query: Record<string, unknown>) => t.http().get('/storefront/v1/products').query(query).set(shop());

    const storage = await list({ o: 'storage:256 Go' });
    expect(storage.body.items.map((p: { id: string }) => p.id)).toEqual([phone.id]);
    expect(storage.body.items[0].swatches).toEqual(
      expect.arrayContaining([
        { value: 'Violet', hex: '#6A4C93' },
        { value: 'Bleu', hex: expect.stringMatching(/^#/) },
      ]),
    );
    expect((await list({ o: 'storage:1 To' })).body.items).toEqual([]);

    const chargers = await list({ a: 'accessoryType:CHARGER' });
    expect(chargers.body.items.map((p: { id: string }) => p.id)).toEqual([charger.id]);

    const cheap = await list({ kind: 'ACCESSORY', priceMax: 10_000 });
    expect(cheap.body.items.map((p: { id: string }) => p.id)).toEqual([case12.id]);

    const facets = await t.http().get('/storefront/v1/facets').set(shop());
    expect(facets.status).toBe(200);
    const storageFacet = facets.body.options.find((o: { type: string }) => o.type === 'storage');
    expect(storageFacet.values).toEqual([
      { value: '128 Go', swatch: null, count: 1 },
      { value: '256 Go', swatch: null, count: 1 },
    ]);
    expect(facets.body.kinds).toEqual(
      expect.arrayContaining([
        { value: 'PHONE', label: 'Téléphones', count: 1 },
        { value: 'ACCESSORY', label: 'Accessoires', count: 3 },
      ]),
    );
    expect(facets.body.price).toEqual({ min: 8_000, max: 240_000 });
  });

  it('remise un pack quand l’appareil et ses accessoires sont dans le panier, jusqu’à la commande', async () => {
    const bundle = await t
      .http()
      .post('/api/v1/bundles')
      .set(admin())
      .send({ title: 'Pack iPhone 12 + chargeur', anchorProductId: phone.id, itemProductIds: [charger.id], discountType: 'PERCENT', discountValue: 10 });
    expect(bundle.status, JSON.stringify(bundle.body)).toBe(201);
    expect(bundle.body).toMatchObject({ anchor: { id: phone.id }, items: [{ id: charger.id }] });

    const product = await t.http().get(`/storefront/v1/products/${phone.slug}`).set(shop());
    expect(product.body.bundles).toMatchObject([{ id: bundle.body.id, discountValue: 10, items: [{ id: charger.id }] }]);

    const cart = await t.http().post('/storefront/v1/carts').set(shop());
    const blue128 = phone.variants.find((v) => v.optionValues[0] === '128 Go' && v.optionValues[1] === 'Bleu')!;
    const added = await t
      .http()
      .post(`/storefront/v1/carts/${cart.body.id}/lines/batch`)
      .set(shop())
      .send({ lines: [{ variantId: blue128.id, quantity: 1 }, { variantId: charger.variantId, quantity: 1 }] });
    expect(added.status, JSON.stringify(added.body)).toBe(201);
    expect(added.body).toMatchObject({
      subtotalAmount: 315_000,
      discounts: [{ bundleId: bundle.body.id, quantity: 1, amount: 31_500 }],
      discountAmount: 31_500,
      totalAmount: 283_500,
    });

    const checkout = await t
      .http()
      .post('/storefront/v1/checkout')
      .set(shop({ 'idempotency-key': randomUUID() }))
      .send({
        cartId: cart.body.id,
        email: 'client@example.com',
        phone: '+221770000000',
        shippingAddress: { firstName: 'Awa', lastName: 'Diop', line1: 'Almadies', city: 'Dakar', country: 'SN' },
      });
    expect(checkout.status, JSON.stringify(checkout.body)).toBe(201);
    expect(checkout.body.totalAmount).toBe(283_500);

    const orders = await t.http().get('/api/v1/orders').query({ q: String(checkout.body.orderNumber) }).set(admin());
    const order = await t.http().get(`/api/v1/orders/${orders.body.items[0].id}`).set(admin());
    expect(order.body).toMatchObject({
      subtotalAmount: 315_000,
      discountAmount: 31_500,
      discounts: [{ bundleId: bundle.body.id, amount: 31_500 }],
    });

    const deleted = await t.http().delete(`/api/v1/bundles/${bundle.body.id}`).set(admin());
    expect(deleted.status).toBe(204);
  });

  it('refuse un ajout groupé si un article n’est pas en vente (rien n’est ajouté)', async () => {
    const cart = await t.http().post('/storefront/v1/carts').set(shop());
    const response = await t
      .http()
      .post(`/storefront/v1/carts/${cart.body.id}/lines/batch`)
      .set(shop())
      .send({ lines: [{ variantId: charger.variantId, quantity: 1 }, { variantId: randomUUID(), quantity: 1 }] });
    expect(response.status).toBe(422);
    const after = await t.http().get(`/storefront/v1/carts/${cart.body.id}`).set(shop());
    expect(after.body.lines).toEqual([]);
  });

  it('refuse un pack avec un produit d’une autre boutique', async () => {
    const other = await createStoreFor(t, { slug: uniqueSlug('autre'), type: 'ELECTRONICS' });
    const response = await t
      .http()
      .post('/api/v1/bundles')
      .set({ Authorization: `Bearer ${other.token}` })
      .send({ title: 'Pack volé', anchorProductId: phone.id, itemProductIds: [charger.id], discountType: 'AMOUNT', discountValue: 100 });
    expect(response.status).toBe(422);
  });

  it('commande sur demande : demande → devis → brouillon avec ligne libre → commande passée sans réserver', async () => {
    const submitted = await t
      .http()
      .post('/storefront/v1/special-requests')
      .set(shop())
      .send({
        productSlug: phone.slug,
        options: [
          { name: 'Stockage', value: '512 Go' },
          { name: 'Couleur', value: 'Rouge' },
          { name: 'Inconnue', value: 'X' },
        ],
        quantity: 2,
        firstName: 'Moussa',
        email: 'Moussa@Example.com',
        phone: '+221771112233',
        note: 'Pour un cadeau',
      });
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(201);
    expect(submitted.body.productTitle).toBe('iPhone 12');

    const summary = await t.http().get('/api/v1/special-requests/summary').set(admin());
    expect(summary.body.newCount).toBeGreaterThanOrEqual(1);
    const request = await t.http().get(`/api/v1/special-requests/${submitted.body.id}`).set(admin());
    expect(request.body).toMatchObject({
      status: 'NEW',
      currency: 'XOF',
      email: 'moussa@example.com',
      options: [
        { name: 'Stockage', value: '512 Go' },
        { name: 'Couleur', value: 'Rouge' },
      ],
    });

    const tooEarly = await t.http().post(`/api/v1/special-requests/${submitted.body.id}/convert`).set(admin());
    expect(tooEarly.status).toBe(409);
    expect(tooEarly.body.code).toBe('INVALID_REQUEST_TRANSITION');

    const quoted = await t
      .http()
      .post(`/api/v1/special-requests/${submitted.body.id}/quote`)
      .set(admin())
      .send({ unitPriceAmount: 420_000, delay: '5 jours' });
    expect(quoted.body).toMatchObject({ status: 'QUOTED', quotedUnitPriceAmount: 420_000, quotedDelay: '5 jours' });

    const converted = await t.http().post(`/api/v1/special-requests/${submitted.body.id}/convert`).set(admin());
    expect(converted.status, JSON.stringify(converted.body)).toBe(200);
    expect(converted.body.status).toBe('CONVERTED');

    const draft = await t.http().get(`/api/v1/orders/${converted.body.orderId}`).set(admin());
    expect(draft.body).toMatchObject({
      status: 'DRAFT',
      email: 'moussa@example.com',
      subtotalAmount: 840_000,
      lines: [{ custom: true, variantId: null, productTitle: 'iPhone 12', variantTitle: '512 Go / Rouge', quantity: 2 }],
    });

    const placed = await t
      .http()
      .post(`/api/v1/orders/${converted.body.orderId}/place`)
      .set({ ...admin(), 'idempotency-key': randomUUID() });
    expect(placed.status, JSON.stringify(placed.body)).toBe(200);
    expect(placed.body).toMatchObject({ status: 'PLACED', lines: [{ custom: true, tracksInventory: false }] });

    const again = await t.http().post(`/api/v1/special-requests/${submitted.body.id}/convert`).set(admin());
    expect(again.status).toBe(409);
  });

  it('compte le stock de plusieurs déclinaisons d’un coup, et refuse un comptage périmé', async () => {
    const [first, second] = phone.variants;
    const counted = await t
      .http()
      .post('/api/v1/inventory/counts')
      .set(admin())
      .send({ entries: [{ variantId: first!.id, onHand: 7 }, { variantId: second!.id, onHand: 0 }] });
    expect(counted.status, JSON.stringify(counted.body)).toBe(200);
    expect(counted.body.map((level: { onHand: number }) => level.onHand)).toEqual([7, 0]);

    const movements = await t.http().get(`/api/v1/inventory/${first!.id}/movements`).set(admin());
    expect(movements.body.items[0]).toMatchObject({ type: 'ADJUSTMENT', reason: 'Comptage' });

    const stale = await t
      .http()
      .post('/api/v1/inventory/counts')
      .set(admin())
      .send({ entries: [{ variantId: first!.id, onHand: 3, expectedOnHand: 99 }] });
    expect(stale.status).toBe(409);
  });
});
