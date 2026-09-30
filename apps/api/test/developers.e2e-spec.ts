import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPublishedProduct, createStoreFor, createTestApp, type TestApp, uniqueSlug } from './support/test-app.js';

describe('Développeurs : clés pk_ et sk_ (e2e)', () => {
  let t: TestApp;
  let token: string;
  let reader: string;
  let publishable: { id: string; secret: string };
  const FRONT = 'https://shop.exemple.com';

  const admin = () => ({ Authorization: `Bearer ${token}` });
  const withKey = (key: string) => ({ Authorization: `Bearer ${key}` });

  beforeAll(async () => {
    t = await createTestApp();
    ({ token } = await createStoreFor(t, { slug: uniqueSlug('headless'), currency: 'XOF', country: 'SN' }));
    await createPublishedProduct(t, token, { title: 'Wax 6 yards', sku: 'WAX-6', priceAmount: 12_000, stock: 4 });

    const secret = await t
      .http()
      .post('/api/v1/developers/api-keys')
      .set(admin())
      .send({ kind: 'SECRET', name: 'Synchro ERP', scopes: ['catalog:read'] });
    expect(secret.status, JSON.stringify(secret.body)).toBe(201);
    reader = secret.body.secret;

    const created = await t
      .http()
      .post('/api/v1/developers/api-keys')
      .set(admin())
      .send({ kind: 'PUBLISHABLE', name: 'Site Next.js', allowedOrigins: [`${FRONT}/`] });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    publishable = { id: created.body.id, secret: created.body.secret };
  });

  afterAll(async () => {
    await t?.close();
  });

  it('montre la clé secrète une seule fois, la clé publique à chaque fois', async () => {
    expect(reader).toMatch(/^sk_[0-9A-Za-z]{32}$/);
    const list = await t.http().get('/api/v1/developers/api-keys').set(admin());
    expect(list.status).toBe(200);
    const sk = list.body.find((key: { kind: string }) => key.kind === 'SECRET');
    expect(sk).toMatchObject({ name: 'Synchro ERP', token: null, hint: `sk_…${reader.slice(-4)}`, scopes: ['catalog:read'] });
    expect(JSON.stringify(list.body)).not.toContain(reader);
    const pk = list.body.find((key: { kind: string }) => key.kind === 'PUBLISHABLE');
    expect(pk).toMatchObject({ token: publishable.secret, allowedOrigins: [FRONT] });
  });

  it('sk_ : lit avec catalog:read, refuse l’écriture et les routes fermées aux clés', async () => {
    const list = await t.http().get('/api/v1/products').set(withKey(reader));
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    expect(list.body.items.map((p: { title: string }) => p.title)).toEqual(['Wax 6 yards']);

    const write = await t.http().post('/api/v1/brands').set(withKey(reader)).send({ name: 'Vlisco' });
    expect(write.status).toBe(403);
    expect(write.body).toMatchObject({ code: 'INSUFFICIENT_SCOPE', details: { required: 'catalog:write' } });

    const orders = await t.http().get('/api/v1/orders').set(withKey(reader));
    expect(orders.body.code).toBe('INSUFFICIENT_SCOPE');

    const closed = await t.http().get('/api/v1/stores/current').set(withKey(reader));
    expect(closed.status).toBe(403);
    expect(closed.body.code).toBe('API_KEY_FORBIDDEN');
    const keys = await t.http().get('/api/v1/developers/api-keys').set(withKey(reader));
    expect(keys.body.code).toBe('API_KEY_FORBIDDEN');
  });

  it('sk_ : isolée dans sa boutique, refusée une fois révoquée', async () => {
    const other = await createStoreFor(t, { slug: uniqueSlug('autre') });
    await createPublishedProduct(t, other.token, { title: 'Autre boutique', sku: 'AUT-1', priceAmount: 1 });
    const list = await t.http().get('/api/v1/products').set(withKey(reader));
    expect(list.body.items.map((p: { title: string }) => p.title)).toEqual(['Wax 6 yards']);

    const writer = await t
      .http()
      .post('/api/v1/developers/api-keys')
      .set(admin())
      .send({ kind: 'SECRET', name: 'Temporaire', scopes: ['catalog:write'] });
    expect((await t.http().get('/api/v1/categories').set(withKey(writer.body.secret))).status).toBe(200);
    const revoked = await t.http().post(`/api/v1/developers/api-keys/${writer.body.id}/revoke`).set(admin());
    expect(revoked.body.revokedAt).not.toBeNull();
    const refused = await t.http().get('/api/v1/categories').set(withKey(writer.body.secret));
    expect(refused.status).toBe(401);
    expect((await t.http().get('/api/v1/products').set(withKey('sk_inventee'))).status).toBe(401);
  });

  it('pk_ : ouvre la vitrine sans site généré, depuis une origine déclarée seulement', async () => {
    const key = { 'x-publishable-key': publishable.secret };
    const server = await t.http().get('/storefront/v1/products').set(key);
    expect(server.status, JSON.stringify(server.body)).toBe(200);
    expect(server.body.items.map((p: { title: string }) => p.title)).toEqual(['Wax 6 yards']);

    const browser = await t.http().get('/storefront/v1/products').set({ ...key, Origin: FRONT });
    expect(browser.status).toBe(200);
    expect(browser.headers['access-control-allow-origin']).toBe(FRONT);

    const intruder = await t.http().get('/storefront/v1/products').set({ ...key, Origin: 'https://pirate.exemple' });
    expect(intruder.status).toBe(403);
    expect(intruder.body.code).toBe('ORIGIN_NOT_ALLOWED');
    expect(intruder.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await t
      .http()
      .options('/storefront/v1/products')
      .set({ Origin: FRONT, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'x-publishable-key' });
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(FRONT);
    expect(preflight.headers['access-control-allow-headers']).toContain('x-publishable-key');

    const admin = await t.http().get('/api/v1/products').set(withKey(publishable.secret));
    expect(admin.status).toBe(401);
  });

  it('refuse une origine avec chemin et ne laisse pas une clé publique porter des droits', async () => {
    const bad = await t
      .http()
      .post('/api/v1/developers/api-keys')
      .set(admin())
      .send({ kind: 'PUBLISHABLE', name: 'X', allowedOrigins: ['https://exemple.com/boutique'] });
    expect(bad.status).toBe(422);
    const scoped = await t.http().patch(`/api/v1/developers/api-keys/${publishable.id}`).set(admin()).send({ scopes: ['orders:write'] });
    expect(scoped.status).toBe(422);
  });
});
