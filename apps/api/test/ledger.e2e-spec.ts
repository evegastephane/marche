import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type AppPrismaClient, PRISMA } from '../src/shared/infrastructure/prisma/prisma.client.js';
import { categoryId, createStoreFor, createTestApp, type TestApp, uniqueSlug } from './support/test-app.js';

const IMEIS = ['356938035643809', '490154203237518', '353918055306232', '358240051111110'];

interface LedgerRow {
  variant_id: string;
  on_hand: number;
  ledger: number;
  in_stock: number;
}

describe('Journal du stock : le stock est la somme des mouvements (e2e)', () => {
  let t: TestApp;
  let token: string;
  let storeId: string;
  let db: AppPrismaClient;
  let charger: string;
  let phone: string;
  const admin = () => ({ Authorization: `Bearer ${token}` });

  const adjust = async (variantId: string, body: object) => {
    const response = await t.http().post(`/api/v1/inventory/${variantId}/adjustments`).set(admin()).send(body);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  };

  beforeAll(async () => {
    t = await createTestApp();
    ({ token, storeId } = await createStoreFor(t, { slug: uniqueSlug('journal'), currency: 'XAF', country: 'CM', type: 'ELECTRONICS' }));
    db = t.moduleRef.get<AppPrismaClient>(PRISMA, { strict: false });

    const chargerProduct = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({
        title: 'Chargeur 20 W',
        categoryId: await categoryId(t, token, 'chargeurs'),
        specs: { puissance: 20, 'type-connecteur': 'USB-C' },
        variants: [{ sku: 'CHG-20', priceAmount: 15_000, initialQuantity: 10 }],
      });
    expect(chargerProduct.status, JSON.stringify(chargerProduct.body)).toBe(201);
    charger = chargerProduct.body.variants[0].id;

    const phoneProduct = await t
      .http()
      .post('/api/v1/products')
      .set(admin())
      .send({
        title: 'iPhone 17 Pro',
        categoryId: await categoryId(t, token, 'smartphones'),
        reference: 'IP17P',
        variants: [
          {
            sku: 'IP17P-256-BLU',
            options: { stockage: '256 Go', ram: '12 Go', couleur: 'Bleu' },
            priceAmount: 900_000,
            units: IMEIS.slice(0, 3).map((serial) => ({ serial })),
          },
        ],
      });
    expect(phoneProduct.status, JSON.stringify(phoneProduct.body)).toBe(201);
    phone = phoneProduct.body.variants[0].id;
  });

  afterAll(async () => {
    await t?.close();
  });

  const ledger = () =>
    db.$queryRaw<LedgerRow[]>`
      SELECT l.variant_id, l.on_hand, s.on_hand AS ledger,
             (SELECT count(*)::int FROM stock_units u WHERE u.variant_id = l.variant_id AND u.status = 'IN_STOCK') AS in_stock
      FROM inventory_levels l
      JOIN variant_stock s ON s.variant_id = l.variant_id
      WHERE l.store_id = ${storeId}::uuid`;

  it('après réception, perte, correction, vente, sortie et retour d’unités, stock = somme du journal', async () => {
    await adjust(charger, { type: 'RECEIPT', quantity: 5 });
    await adjust(charger, { type: 'LOSS', quantity: 2, reason: 'Casse' });
    await adjust(charger, { type: 'ADJUSTMENT', quantity: -1, reason: 'Comptage' });

    const created = await t
      .http()
      .post('/api/v1/orders')
      .set(admin())
      .send({
        customer: { email: 'awa@example.com', firstName: 'Awa' },
        lines: [
          { variantId: charger, quantity: 2 },
          { variantId: phone, quantity: 1 },
        ],
      });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const placed = await t
      .http()
      .post(`/api/v1/orders/${created.body.id}/place`)
      .set({ ...admin(), 'idempotency-key': randomUUID() });
    expect(placed.status, JSON.stringify(placed.body)).toBe(200);
    const phoneLine = placed.body.lines.find((line: { variantId: string }) => line.variantId === phone);
    const shipped = await t
      .http()
      .post(`/api/v1/orders/${created.body.id}/fulfill`)
      .set(admin())
      .send({ serialNumbers: [{ lineId: phoneLine.id, values: [IMEIS[0]] }] });
    expect(shipped.status, JSON.stringify(shipped.body)).toBe(200);

    const units = await t.http().get(`/api/v1/inventory/${phone}/units`).query({ status: 'IN_STOCK' }).set(admin());
    const unit = units.body.items.find((item: { serial: string }) => item.serial === IMEIS[1]);
    const removed = await t.http().post(`/api/v1/inventory/units/${unit.id}/remove`).set(admin()).send({ reason: 'Écran cassé' });
    expect(removed.body).toMatchObject({ status: 'REMOVED' });
    const returned = await t.http().post(`/api/v1/inventory/units/${unit.id}/return`).set(admin()).send({ reason: 'Réparé' });
    expect(returned.body).toMatchObject({ status: 'IN_STOCK' });
    const received = await t
      .http()
      .post(`/api/v1/inventory/${phone}/units`)
      .set(admin())
      .send({ units: [{ serial: IMEIS[3], batteryHealth: 92 }], condition: 'USED', reason: 'Reprise client' });
    expect(received.status, JSON.stringify(received.body)).toBe(201);

    const rows = await ledger();
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.on_hand, `variante ${row.variant_id}`).toBe(row.ledger);
    const byVariant = new Map(rows.map((row) => [row.variant_id, row]));
    // 10 + 5 − 2 − 1 − 2 vendus
    expect(byVariant.get(charger)?.on_hand).toBe(10);
    // 3 unités − 1 vendue − 1 sortie + 1 remise + 1 reçue ; suivi à l'unité : stock = unités en stock
    expect(byVariant.get(phone)).toMatchObject({ on_hand: 3, in_stock: 3 });

    const movements = await t.http().get(`/api/v1/inventory/${charger}/movements`).set(admin());
    expect(movements.body.items.map((m: { type: string }) => m.type).sort()).toEqual(['ADJUSTMENT', 'INITIAL', 'LOSS', 'RECEIPT', 'SALE']);
  });

  it('la base refuse de modifier le stock en main sans mouvement', async () => {
    await expect(db.$executeRaw`UPDATE inventory_levels SET on_hand = on_hand + 1 WHERE variant_id = ${charger}::uuid`).rejects.toThrow(
      /ne change que par un mouvement/,
    );
  });

  it('un mouvement est immuable : une correction est un contre-mouvement', async () => {
    await expect(db.$executeRaw`UPDATE stock_movements SET quantity = 99 WHERE variant_id = ${charger}::uuid`).rejects.toThrow(
      /ne se modifie pas/,
    );
    const rows = await ledger();
    expect(rows.every((row) => row.on_hand === row.ledger)).toBe(true);
  });

  it('refuse un ajustement libre sur une variante suivie à l’unité', async () => {
    const response = await t.http().post(`/api/v1/inventory/${phone}/adjustments`).set(admin()).send({ type: 'RECEIPT', quantity: 1 });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('UNIT_TRACKED_VARIANT');
  });
});
