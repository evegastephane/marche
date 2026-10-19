import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DeviceCatalog } from '../src/modules/devices/application/devices.ports.js';
import { categoryId, createStoreFor, createTestApp, STOREFRONT_TOKEN, type TestApp, uniqueSlug } from './support/test-app.js';

/** IMEI de test à 15 chiffres avec une clé de Luhn valide. */
function imei(body14: string): string {
  const sum = body14.split('').reverse().reduce((total, char, index) => {
    const digit = Number(char) * (index % 2 === 0 ? 2 : 1);
    return total + (digit > 9 ? digit - 9 : digit);
  }, 0);
  return `${body14}${(10 - (sum % 10)) % 10}`;
}

const IMEIS = Array.from({ length: 6 }, (_, i) => imei(`3569380356430${i}`));

type VariantBody = { id: string; options: Record<string, string> };

describe('Boutique électronique : catégories, IMEI, accessoires, packs, demandes (e2e)', () => {
  let t: TestApp;
  let token: string;
  let slug: string;
  let phone: { id: string; slug: string; variants: VariantBody[] };
  let charger: { id: string; variantId: string };
  let case17: { id: string; variantId: string };
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

  const accessory = async (category: string, title: string, sku: string, priceAmount: number, rest: Record<string, unknown>) => {
    const body = await publishedProduct({
      title,
      categoryId: await categoryId(t, token, category),
      variants: [{ sku, priceAmount, initialQuantity: 20, ...(rest.options ? { options: rest.options } : {}) }],
      specs: rest.specs ?? {},
    });
    return { id: body.id as string, variantId: body.variants[0].id as string };
  };

  beforeAll(async () => {
    t = await createTestApp();
    slug = uniqueSlug('volta');
    ({ token } = await createStoreFor(t, { slug, name: 'Volta Mobile', currency: 'XOF', country: 'SN', type: 'ELECTRONICS' }));

    charger = await accessory('chargeurs', 'Chargeur 20 W', 'CHG-20', 15_000, {
      specs: { puissance: 20, 'type-connecteur': 'USB-C', compatibilite: ['iPhone 17 Pro', 'iPhone 17'] },
    });
    // Valeur saisie sans respecter la casse : ramenée à la valeur de l'attribut.
    case17 = await accessory('coques-pochettes', 'Coque silicone', 'COQ-17', 8_000, {
      options: { couleur: 'Noir' },
      specs: { compatibilite: ['iphone 17 pro'] },
    });
    earphones = await accessory('ecouteurs', 'Écouteurs sans fil', 'ECO-1', 25_000, {
      options: { couleur: 'Blanc' },
      specs: { 'reduction-bruit': true, connectivite: ['Bluetooth'] },
    });

    // Un téléphone se décrit jusqu'au bout : stockage, couleur, état, SIM, taille d'écran (RAM facultative).
    const axes = (stockage: string, couleur: string, etat: string) => ({
      stockage,
      ram: '12 Go',
      couleur,
      etat,
      sim: 'Double SIM',
      'taille-ecran': '6,3 pouces',
    });
    phone = await publishedProduct({
      title: 'iPhone 17 Pro',
      categoryId: await categoryId(t, token, 'smartphones'),
      reference: 'IP17P',
      specs: { reseau: '5G' },
      variants: [
        {
          sku: 'IP17P-256-BLU-NEW',
          options: axes('256 Go', 'Bleu', 'Neuf'),
          priceAmount: 300_000,
          units: IMEIS.slice(0, 3).map((serial) => ({ serial })),
        },
        { sku: 'IP17P-512-BLU-NEW', options: axes('512 Go', 'Bleu', 'Neuf'), priceAmount: 350_000, units: [{ serial: IMEIS[3]! }] },
        {
          sku: 'IP17P-256-PRP-RFA',
          options: axes('256 Go', 'Violet', 'Reconditionné – Excellent'),
          priceAmount: 240_000,
          units: [{ serial: IMEIS[4]!, batteryHealth: 91 }, { serial: IMEIS[5]!, batteryHealth: 88 }],
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

  it('expose le type de la boutique ; une boutique Tech n’a pas de guide des tailles', async () => {
    const store = await t.http().get('/storefront/v1/store').set(shop());
    expect(store.body.type).toBe('ELECTRONICS');
    expect(store.body.sizeGuide).toBeNull();
  });

  it('refuse un produit sans catégorie connue (422 INVALID_CATEGORY)', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({ title: 'Robe', categoryId: randomUUID(), variants: [{ sku: 'ROBE-X', priceAmount: 1000 }] });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INVALID_CATEGORY');
  });

  it('valide la fiche technique selon les attributs de la catégorie', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({
        title: 'Chargeur',
        categoryId: await categoryId(t, token, 'chargeurs'),
        specs: { 'type-connecteur': 'TELEPORTEUR' },
        variants: [{ sku: 'X-1', priceAmount: 1 }],
      });
    expect(response.status).toBe(422);
  });

  it('bloque la publication tant qu’un attribut obligatoire est vide (règle 10)', async () => {
    const draft = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({ title: 'Chargeur sans fiche', categoryId: await categoryId(t, token, 'chargeurs'), variants: [{ sku: 'CHG-NU', priceAmount: 5_000 }] });
    expect(draft.status, JSON.stringify(draft.body)).toBe(201);
    expect(draft.body.status).toBe('DRAFT');
    const refused = await t.http().post(`/api/v1/products/${draft.body.id}/publish`).set(admin());
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('PRODUCT_NOT_PUBLISHABLE');
    expect(refused.body.details.problems.map((p: { slug: string }) => p.slug)).toEqual(
      expect.arrayContaining(['puissance', 'type-connecteur']),
    );
  });

  it('exige les IMEI du stock initial d’un téléphone (suivi à l’unité)', async () => {
    const response = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({
        title: 'Galaxy S25',
        categoryId: await categoryId(t, token, 'smartphones'),
        variants: [{ sku: 'S25-1', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Noir' }, priceAmount: 1, initialQuantity: 2 }],
      });
    expect(response.status).toBe(422);
  });

  it('garde catégorie, référence, fiche technique et axes ; stock = unités en stock', async () => {
    const product = await t.http().get(`/api/v1/products/${phone.id}`).set(admin());
    expect(product.body).toMatchObject({
      category: { slug: 'smartphones' },
      tracksUnits: true,
      reference: 'IP17P',
      specs: { reseau: '5G' },
      accessories: [{ id: earphones.id, title: 'Écouteurs sans fil' }],
    });
    expect(product.body.variants[0]).toMatchObject({
      title: '256 Go / Bleu / Neuf / Double SIM / 6,3 pouces / 12 Go',
      options: { stockage: '256 Go', ram: '12 Go', couleur: 'Bleu', etat: 'Neuf', sim: 'Double SIM', 'taille-ecran': '6,3 pouces' },
      inventory: { onHand: 3 },
    });
    const units = await t.http().get(`/api/v1/inventory/${phone.variants[2]!.id}/units`).set(admin());
    expect(units.status, JSON.stringify(units.body)).toBe(200);
    expect(units.body.items.map((u: { serial: string; condition: string }) => [u.serial, u.condition])).toEqual(
      expect.arrayContaining([
        [IMEIS[4], 'USED'],
        [IMEIS[5], 'USED'],
      ]),
    );
  });

  it('propose les accessoires choisis, puis les compatibles avec l’appareil', async () => {
    const product = await t.http().get(`/storefront/v1/products/${phone.slug}`).set(shop());
    expect(product.status).toBe(200);
    expect(product.body).toMatchObject({ kind: 'PHONE', category: { slug: 'smartphones' } });
    expect(product.body.specs).toEqual(
      expect.arrayContaining([
        { slug: 'reseau', label: 'Réseau', value: '5G' },
      ]),
    );
    // La taille d'écran et la SIM sont des choix de l'acheteur, plus des lignes de fiche.
    expect(product.body.specs.map((spec: { slug: string }) => spec.slug)).not.toContain('taille-ecran');
    expect(product.body.options.map((o: { name: string; type: string }) => [o.name, o.type])).toEqual([
      ['Stockage', 'storage'],
      ['Couleur', 'color'],
      ['État', 'condition'],
      ['SIM', 'text'],
      ['Taille écran', 'screen'],
      ['RAM', 'memory'],
    ]);
    expect(product.body.options[3]).toMatchObject({ values: ['Double SIM'] });
    expect(product.body.options[1]).toMatchObject({ swatches: { Violet: '#6A4C93' } });
    const ids = product.body.accessories.map((a: { id: string }) => a.id);
    expect(ids[0]).toBe(earphones.id);
    expect(ids).toEqual(expect.arrayContaining([charger.id, case17.id]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(product.body.accessories[0]).toMatchObject({ variantId: earphones.variantId, attributes: { accessoryType: 'EARPHONES' } });
  });

  it('filtre le catalogue par axe, attribut et prix, avec les compteurs', async () => {
    const list = (query: Record<string, unknown>) => t.http().get('/storefront/v1/products').query(query).set(shop());

    const storage = await list({ o: 'storage:512 Go' });
    expect(storage.body.items.map((p: { id: string }) => p.id)).toEqual([phone.id]);
    expect(storage.body.items[0].swatches).toEqual(
      expect.arrayContaining([
        { value: 'Violet', hex: '#6A4C93' },
        { value: 'Bleu', hex: expect.stringMatching(/^#/) },
      ]),
    );
    expect((await list({ o: 'storage:1 To' })).body.items).toEqual([]);

    expect((await list({ a: 'accessoryType:CHARGER' })).body.items.map((p: { id: string }) => p.id)).toEqual([charger.id]);
    expect((await list({ a: 'type-connecteur:USB-C' })).body.items.map((p: { id: string }) => p.id)).toEqual([charger.id]);

    const cheap = await list({ kind: 'ACCESSORY', priceMax: 10_000 });
    expect(cheap.body.items.map((p: { id: string }) => p.id)).toEqual([case17.id]);

    const facets = await t.http().get('/storefront/v1/facets').set(shop());
    expect(facets.status).toBe(200);
    const storageFacet = facets.body.options.find((o: { type: string }) => o.type === 'storage');
    expect(storageFacet.values).toEqual([
      { value: '256 Go', swatch: null, count: 1 },
      { value: '512 Go', swatch: null, count: 1 },
    ]);
    expect(facets.body.kinds).toEqual(
      expect.arrayContaining([
        { value: 'PHONE', label: 'Téléphones', count: 1 },
        { value: 'ACCESSORY', label: 'Accessoires', count: 3 },
      ]),
    );
    expect(facets.body.attributes.find((a: { key: string }) => a.key === 'reduction-bruit')).toMatchObject({
      label: 'Réduction de bruit',
      values: [{ value: 'true', label: 'Oui', count: 1 }],
    });
    expect(facets.body.price).toEqual({ min: 8_000, max: 240_000 });
  });

  it('remise un pack quand l’appareil et ses accessoires sont dans le panier, jusqu’à la commande', async () => {
    const bundle = await t
      .http()
      .post('/api/v1/bundles')
      .set(admin())
      .send({ title: 'Pack iPhone 17 Pro + chargeur', anchorProductId: phone.id, itemProductIds: [charger.id], discountType: 'PERCENT', discountValue: 10 });
    expect(bundle.status, JSON.stringify(bundle.body)).toBe(201);
    expect(bundle.body).toMatchObject({ anchor: { id: phone.id }, items: [{ id: charger.id }] });

    const product = await t.http().get(`/storefront/v1/products/${phone.slug}`).set(shop());
    expect(product.body.bundles).toMatchObject([{ id: bundle.body.id, discountValue: 10, items: [{ id: charger.id }] }]);

    const cart = await t.http().post('/storefront/v1/carts').set(shop());
    const blue256 = phone.variants.find((v) => v.options.stockage === '256 Go' && v.options.couleur === 'Bleu')!;
    const added = await t
      .http()
      .post(`/storefront/v1/carts/${cart.body.id}/lines/batch`)
      .set(shop())
      .send({ lines: [{ variantId: blue256.id, quantity: 1 }, { variantId: charger.variantId, quantity: 1 }] });
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
          { name: 'Stockage', value: '1 To' },
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
    expect(submitted.body.productTitle).toBe('iPhone 17 Pro');

    const summary = await t.http().get('/api/v1/special-requests/summary').set(admin());
    expect(summary.body.newCount).toBeGreaterThanOrEqual(1);
    const request = await t.http().get(`/api/v1/special-requests/${submitted.body.id}`).set(admin());
    expect(request.body).toMatchObject({
      status: 'NEW',
      currency: 'XOF',
      email: 'moussa@example.com',
      options: [
        { name: 'Stockage', value: '1 To' },
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
      lines: [{ custom: true, variantId: null, productTitle: 'iPhone 17 Pro', variantTitle: '1 To / Rouge', quantity: 2 }],
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

  it('compte le stock de plusieurs articles d’un coup, refuse un comptage périmé ou un article suivi à l’unité', async () => {
    const counted = await t
      .http()
      .post('/api/v1/inventory/counts')
      .set(admin())
      .send({ entries: [{ variantId: charger.variantId, onHand: 7 }, { variantId: case17.variantId, onHand: 0 }] });
    expect(counted.status, JSON.stringify(counted.body)).toBe(200);
    expect(counted.body.map((level: { onHand: number }) => level.onHand)).toEqual([7, 0]);

    const movements = await t.http().get(`/api/v1/inventory/${charger.variantId}/movements`).set(admin());
    expect(movements.body.items[0]).toMatchObject({ type: 'ADJUSTMENT', reason: 'Comptage' });

    const stale = await t
      .http()
      .post('/api/v1/inventory/counts')
      .set(admin())
      .send({ entries: [{ variantId: charger.variantId, onHand: 3, expectedOnHand: 99 }] });
    expect(stale.status).toBe(409);

    const tracked = await t
      .http()
      .post('/api/v1/inventory/counts')
      .set(admin())
      .send({ entries: [{ variantId: phone.variants[1]!.id, onHand: 5 }] });
    expect(tracked.status).toBe(422);
    expect(tracked.body.code).toBe('UNIT_TRACKED_VARIANT');
  });

  it('reprise : refusée tant que la boutique ne la propose pas, puis reçue avec l’appareil à reprendre', async () => {
    const request = {
      type: 'TRADE_IN',
      productSlug: phone.slug,
      options: [{ name: 'Stockage', value: '256 Go' }],
      details: [
        { name: 'Modèle', value: 'iPhone 11' },
        { name: 'État', value: 'Traces d’usage' },
      ],
      firstName: 'Fatou',
      email: 'fatou@example.com',
      phone: '+221770000001',
    };
    const refused = await t.http().post('/storefront/v1/special-requests').set(shop()).send(request);
    expect(refused.status).toBe(422);

    const enabled = await t
      .http()
      .patch('/api/v1/stores/current')
      .set(admin())
      .send({
        verticalSettings: {
          tradeIn: { enabled: true, text: 'Nous reprenons votre ancien téléphone.' },
          serialNumbers: { enabled: true },
        },
      });
    expect(enabled.status, JSON.stringify(enabled.body)).toBe(200);
    const store = await t.http().get('/storefront/v1/store').set(shop());
    expect(store.body.services).toMatchObject({
      tradeIn: { text: 'Nous reprenons votre ancien téléphone.' },
      serialNumbers: true,
      sizeExchange: null,
    });

    const received = await t.http().post('/storefront/v1/special-requests').set(shop()).send(request);
    expect(received.status, JSON.stringify(received.body)).toBe(201);
    const list = await t.http().get('/api/v1/special-requests?type=TRADE_IN').set(admin());
    expect(list.body.items[0]).toMatchObject({ type: 'TRADE_IN', details: request.details, options: request.options });

    // Le sur mesure est un service de boutique de mode : refusé ici.
    const measure = await t
      .http()
      .post('/storefront/v1/special-requests')
      .set(shop())
      .send({ ...request, type: 'MADE_TO_MEASURE' });
    expect(measure.status).toBe(422);
  });

  it('IMEI : la pièce expédiée sort du stock, une par exemplaire (règle 6)', async () => {
    const variant = phone.variants.find((v) => v.options.stockage === '512 Go')!;
    const created = await t
      .http()
      .post('/api/v1/orders')
      .set(admin())
      .send({ customer: { email: 'ibou@example.com', firstName: 'Ibou' }, lines: [{ variantId: variant.id, quantity: 1 }] });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const placed = await t
      .http()
      .post(`/api/v1/orders/${created.body.id}/place`)
      .set({ ...admin(), 'idempotency-key': randomUUID() });
    expect(placed.status, JSON.stringify(placed.body)).toBe(200);
    const lineId = placed.body.lines[0].id as string;
    const fulfill = (values: string[]) =>
      t.http().post(`/api/v1/orders/${created.body.id}/fulfill`).set(admin()).send({ serialNumbers: [{ lineId, values }] });

    expect((await fulfill([IMEIS[3]!, IMEIS[0]!])).status).toBe(422);
    const missing = await fulfill([]);
    expect(missing.status).toBe(422);
    expect(missing.body.code).toBe('UNIT_TRACKED_VARIANT');
    // Une pièce d'une autre déclinaison n'est pas en stock pour celle-ci.
    expect((await fulfill([IMEIS[0]!])).status).toBe(422);

    const shipped = await fulfill([`${IMEIS[3]!.slice(0, 5)} ${IMEIS[3]!.slice(5)}`]);
    expect(shipped.status, JSON.stringify(shipped.body)).toBe(200);
    expect(shipped.body).toMatchObject({ status: 'FULFILLED', lines: [{ serialNumbers: [IMEIS[3]] }] });

    const units = await t.http().get(`/api/v1/inventory/${variant.id}/units`).set(admin());
    expect(units.body.items).toMatchObject([{ serial: IMEIS[3], status: 'SOLD' }]);
    const product = await t.http().get(`/api/v1/products/${phone.id}`).set(admin());
    expect(product.body.variants.find((v: { id: string }) => v.id === variant.id).inventory).toMatchObject({ onHand: 0, reserved: 0 });
  });

  it('catalogue d’appareils : sans clé du service, seules les fiches déjà connues sont proposées', async () => {
    const empty = await t.http().get('/api/v1/devices/search?q=galaxy').set(admin());
    expect(empty.body).toEqual({ items: [], online: false });
    const offline = await t.http().post('/api/v1/devices/import').set(admin()).send({ ref: 'online:123' });
    expect(offline.status).toBe(503);
    expect(offline.body.code).toBe('DEVICE_SERVICE_DISABLED');

    const record = await t.moduleRef.get(DeviceCatalog, { strict: false }).save(
      {
        provider: 'mobileapi',
        providerId: `e2e-${randomUUID()}`,
        brand: 'Samsung',
        name: 'Galaxy A54 5G',
        kind: 'PHONE',
        year: 2023,
        attributes: { model: 'Galaxy A54 5G', screenSize: 6.4, network5g: true },
        storages: ['128 Go', '256 Go'],
        colors: [{ value: 'Noir', hex: '#111111' }],
        description: 'Le Samsung Galaxy A54 5G offre un écran de 6,4 pouces.',
      },
      {},
      'samsung galaxy a54 5g',
    );
    const found = await t.http().get('/api/v1/devices/search?q=Galaxy%20A54').set(admin());
    expect(found.body.items).toEqual([
      { ref: `catalog:${record.id}`, brand: 'Samsung', name: 'Samsung Galaxy A54 5G', year: 2023, source: 'catalog' },
    ]);
    const sheet = await t.http().post('/api/v1/devices/import').set(admin()).send({ ref: `catalog:${record.id}` });
    expect(sheet.status).toBe(200);
    expect(sheet.body).toMatchObject({
      name: 'Samsung Galaxy A54 5G',
      kind: 'PHONE',
      storages: ['128 Go', '256 Go'],
      attributes: { screenSize: 6.4 },
    });
  });
});
