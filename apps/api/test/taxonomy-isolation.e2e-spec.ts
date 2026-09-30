import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categoryId, createStoreFor, createTestApp, type TestApp, uniqueSlug } from './support/test-app.js';

const IMEI = '356938035643809';

/** Téléphone minimal d'une boutique Tech, suivi à l'unité. */
function phone(category: string, serial: string) {
  return {
    title: 'iPhone 17 Pro',
    categoryId: category,
    reference: 'IP17P',
    variants: [
      { sku: 'IP17P-256-BLU', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Bleu' }, priceAmount: 900_000, units: [{ serial }] },
    ],
  };
}

describe('Catalogue dynamique : chaque boutique a le sien (e2e)', () => {
  let t: TestApp;
  let douala: string;
  let dakar: string;
  let drones: string;
  let indice: string;
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    ({ token: douala } = await createStoreFor(t, { slug: uniqueSlug('observe'), currency: 'XAF', country: 'CM', type: 'ELECTRONICS' }));
    ({ token: dakar } = await createStoreFor(t, { slug: uniqueSlug('volta'), currency: 'XOF', country: 'SN', type: 'ELECTRONICS' }));

    const category = await t.http().post('/api/v1/categories').set(as(douala)).send({ name: 'Drones' });
    expect(category.status, JSON.stringify(category.body)).toBe(201);
    drones = category.body.id;
    const attribute = await t
      .http()
      .post('/api/v1/attributes')
      .set(as(douala))
      .send({ name: 'Indice de réparabilité', type: 'NUMBER', unit: '/10', categoryId: drones });
    expect(attribute.status, JSON.stringify(attribute.body)).toBe(201);
    indice = attribute.body.id;
  });

  afterAll(async () => {
    await t?.close();
  });

  it('les catégories et attributs d’une boutique sont invisibles pour une autre', async () => {
    const categories = await t.http().get('/api/v1/categories').set(as(dakar));
    expect(categories.body.map((c: { id: string }) => c.id)).not.toContain(drones);
    expect(categories.body.map((c: { slug: string }) => c.slug)).not.toContain('drones');
    const attributes = await t.http().get('/api/v1/attributes').set(as(dakar));
    expect(attributes.body.map((a: { id: string }) => a.id)).not.toContain(indice);

    expect((await t.http().get(`/api/v1/categories/${drones}`).set(as(dakar))).status).toBe(404);
    expect((await t.http().get(`/api/v1/attributes/${indice}`).set(as(dakar))).status).toBe(404);
    expect((await t.http().post(`/api/v1/attributes/${indice}/values`).set(as(dakar)).send({ value: '9' })).status).toBe(404);
  });

  it('une boutique ne peut ni ranger un produit dans la catégorie d’une autre, ni lier son attribut', async () => {
    const product = await t
      .http()
      .post('/api/v1/products')
      .set(as(dakar))
      .send({ title: 'Drone', categoryId: drones, variants: [{ sku: 'DRN-1', priceAmount: 100_000, initialQuantity: 1 }] });
    expect(product.status).toBe(422);
    expect(product.body.code).toBe('INVALID_CATEGORY');

    const own = await categoryId(t, dakar, 'autres');
    const link = await t
      .http()
      .put(`/api/v1/categories/${own}/attributes`)
      .set(as(dakar))
      .send({ attributes: [{ attributeId: indice, required: false }] });
    expect(link.status).toBeGreaterThanOrEqual(400);
    expect(link.status).toBeLessThan(500);
  });

  it('SKU, référence et IMEI sont uniques par boutique, pas sur toute la plateforme', async () => {
    const first = await t.http().post('/api/v1/products').set(as(douala)).send(phone(await categoryId(t, douala, 'smartphones'), IMEI));
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    const second = await t.http().post('/api/v1/products').set(as(dakar)).send(phone(await categoryId(t, dakar, 'smartphones'), IMEI));
    expect(second.status, JSON.stringify(second.body)).toBe(201);

    const check = await t.http().post('/api/v1/products/sku-check').set(as(dakar)).send({ skus: ['IP17P-256-BLU'], reference: 'IP17P' });
    expect(check.body).toEqual({ takenSkus: ['IP17P-256-BLU'], referenceTaken: true });
    const units = await t.http().get(`/api/v1/inventory/${second.body.variants[0].id}/units`).set(as(dakar));
    expect(units.body.items).toMatchObject([{ serial: IMEI, status: 'IN_STOCK' }]);
  });

  it('l’import d’une boutique ne voit pas les catégories d’une autre', async () => {
    const book = new ExcelJS.Workbook();
    book.addWorksheet('PRODUCTS').addRows([
      ['reference', 'titre', 'categorie'],
      ['DRN1', 'Drone', 'drones'],
    ]);
    book.addWorksheet('VARIANTS').addRows([
      ['reference', 'sku', 'prix'],
      ['DRN1', 'DRN1', 100000],
    ]);
    const file = Buffer.from((await book.xlsx.writeBuffer()) as ArrayBuffer);
    const report = await t.http().post('/api/v1/imports/catalog?dryRun=true').set(as(dakar)).attach('file', file, 'catalogue.xlsx');
    expect(report.body.ok).toBe(false);
    expect(report.body.issues).toEqual(expect.arrayContaining([expect.objectContaining({ sheet: 'PRODUCTS', row: 2, column: 'categorie' })]));
  });
});
