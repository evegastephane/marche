import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStoreFor, createTestApp, type TestApp, uniqueSlug } from './support/test-app.js';

type Rows = (string | number | null)[][];

/** Classeur d'import : une feuille par entrée, première ligne = en-têtes. */
async function workbook(sheets: Record<string, Rows>): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = book.addWorksheet(name);
    for (const row of rows) sheet.addRow(row);
  }
  return Buffer.from((await book.xlsx.writeBuffer()) as ArrayBuffer);
}

const IMEI_A = '356938035643809';
const IMEI_B = '490154203237518';

const VALID: Record<string, Rows> = {
  ATTRIBUTES: [
    ['slug', 'nom', 'type', 'unite', 'axe', 'filtre', 'categories', 'obligatoire'],
    ['indice-reparabilite', 'Indice de réparabilité', 'nombre', '/10', 'non', 'oui', 'chargeurs', 'non'],
  ],
  ATTRIBUTE_VALUES: [
    ['attribut', 'valeur', 'code', 'pastille'],
    ['couleur', 'Vert sauge', 'VSG', '#9CAF88'],
  ],
  PRODUCTS: [
    ['reference', 'titre', 'categorie', 'marque', 'description', 'garantie_mois', 'statut', 'puissance', 'type-connecteur', 'indice-reparabilite'],
    ['CHG20', 'Chargeur 20 W', 'chargeurs', 'Anker', 'Charge rapide USB-C', 12, 'en vente', 20, 'USB-C', 8],
    ['IP16', 'iPhone 16', 'Smartphones', 'Apple', null, 12, 'brouillon', null, null, null],
  ],
  VARIANTS: [
    ['reference', 'sku', 'prix', 'prix_barre', 'prix_achat', 'stock', 'code_barres', 'stockage', 'couleur'],
    ['CHG20', 'CHG20', '15 000', null, 9000, 5, null, null, null],
    ['IP16', 'IP16-128-VSG', 450000, null, null, null, null, '128 Go', 'vert sauge'],
  ],
  UNITS: [
    ['sku', 'imei', 'batterie'],
    ['IP16-128-VSG', IMEI_A, null],
    ['IP16-128-VSG', IMEI_B, 100],
  ],
};

describe('Import du catalogue Excel (e2e)', () => {
  let t: TestApp;
  let token: string;
  const admin = () => ({ Authorization: `Bearer ${token}` });
  const upload = (file: Buffer, dryRun: boolean) =>
    t
      .http()
      .post(`/api/v1/imports/catalog?dryRun=${dryRun}`)
      .set(admin())
      .attach('file', file, 'catalogue.xlsx');

  beforeAll(async () => {
    t = await createTestApp();
    ({ token } = await createStoreFor(t, { slug: uniqueSlug('observe'), currency: 'XAF', country: 'CM', type: 'ELECTRONICS' }));
  });

  afterAll(async () => {
    await t?.close();
  });

  it('fournit un modèle .xlsx avec une colonne par attribut de la boutique', async () => {
    const response = await t
      .http()
      .get('/api/v1/imports/catalog/template')
      .set(admin())
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('spreadsheetml');
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(response.body as unknown as ArrayBuffer);
    const headersOf = (name: string) => {
      const sheet = book.getWorksheet(name);
      if (!sheet) throw new Error(`Feuille ${name} absente`);
      return (sheet.getRow(1).values as unknown[]).filter(Boolean);
    };
    const headers = headersOf('PRODUCTS');
    expect(headers).toEqual(expect.arrayContaining(['reference', 'titre', 'categorie', 'puissance', 'reseau']));
    const axes = headersOf('VARIANTS');
    // La taille d'écran et la SIM sont des choix : une colonne par variante, pas une ligne de fiche.
    expect(axes).toEqual(expect.arrayContaining(['sku', 'prix', 'stockage', 'couleur', 'sim', 'taille-ecran']));
    expect(headers).not.toContain('taille-ecran');
    expect(book.getWorksheet('CATEGORIES')?.rowCount).toBeGreaterThan(5);
  });

  it('rassemble toutes les erreurs, ligne par ligne, et n’écrit rien', async () => {
    const faulty = await workbook({
      PRODUCTS: [
        ['reference', 'titre', 'categorie', 'statut', 'puissance'],
        ['BAD1', 'Chargeur mystère', 'grille-pain', 'en vente', 10],
        ['BAD2', 'Chargeur sans connecteur', 'chargeurs', 'en vente', 'vingt'],
      ],
      VARIANTS: [
        ['reference', 'sku', 'prix', 'stock'],
        ['BAD2', 'BAD2', 'gratuit', -1],
      ],
    });
    const check = await upload(faulty, true);
    expect(check.status, JSON.stringify(check.body)).toBe(200);
    expect(check.body.ok).toBe(false);
    const where = (check.body.issues as { sheet: string; row: number; column: string }[]).map((i) => `${i.sheet}:${i.row}:${i.column}`);
    expect(where).toEqual(
      expect.arrayContaining(['PRODUCTS:2:categorie', 'PRODUCTS:3:puissance', 'VARIANTS:2:prix', 'VARIANTS:2:stock']),
    );

    const applied = await upload(faulty, false);
    expect(applied.status).toBe(422);
    expect(applied.body.code).toBe('IMPORT_REJECTED');
    expect(applied.body.details.issues.length).toBeGreaterThan(0);
    const list = await t.http().get('/api/v1/products').query({ q: 'BAD' }).set(admin());
    expect(list.body.items).toHaveLength(0);
  });

  it('vérifie puis importe : attributs, valeurs, marques, produits, stock et IMEI', async () => {
    const file = await workbook(VALID);
    const check = await upload(file, true);
    expect(check.status, JSON.stringify(check.body)).toBe(200);
    expect(check.body).toMatchObject({
      ok: true,
      summary: { attributesCreated: 1, valuesCreated: 1, productsCreated: 2, variantsCreated: 2, unitsReceived: 2 },
    });

    const applied = await upload(file, false);
    expect(applied.status, JSON.stringify(applied.body)).toBe(200);
    expect(applied.body.ok).toBe(true);

    const list = await t.http().get('/api/v1/products').set(admin());
    const charger = list.body.items.find((item: { reference: string }) => item.reference === 'CHG20');
    const phone = list.body.items.find((item: { reference: string }) => item.reference === 'IP16');
    expect(charger).toMatchObject({ status: 'ACTIVE', brand: { name: 'Anker' } });
    expect(phone).toMatchObject({ status: 'DRAFT', brand: { name: 'Apple' } });

    const chargerDetail = await t.http().get(`/api/v1/products/${charger.id}`).set(admin());
    expect(chargerDetail.body).toMatchObject({
      warrantyMonths: 12,
      specs: { puissance: 20, 'type-connecteur': 'USB-C', 'indice-reparabilite': 8 },
      variants: [{ sku: 'CHG20', priceAmount: 15_000, costAmount: 9_000, inventory: { onHand: 5 } }],
    });
    const phoneDetail = await t.http().get(`/api/v1/products/${phone.id}`).set(admin());
    expect(phoneDetail.body.variants[0]).toMatchObject({
      sku: 'IP16-128-VSG',
      options: { stockage: '128 Go', couleur: 'Vert sauge' },
      inventory: { onHand: 2 },
    });
  });

  it('réimporter le même fichier ne crée rien de plus ; le stock suit la colonne « stock »', async () => {
    const again = await upload(await workbook(VALID), false);
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(again.body.summary).toMatchObject({
      attributesCreated: 0,
      valuesCreated: 0,
      productsCreated: 0,
      productsUpdated: 2,
      variantsCreated: 0,
      stockAdjusted: 0,
      unitsReceived: 0,
    });

    const recount = structuredClone(VALID);
    recount.VARIANTS![1]![5] = 8;
    const adjusted = await upload(await workbook(recount), false);
    expect(adjusted.body.summary.stockAdjusted).toBe(1);
    const list = await t.http().get('/api/v1/products').query({ q: 'CHG20' }).set(admin());
    const detail = await t.http().get(`/api/v1/products/${list.body.items[0].id}`).set(admin());
    expect(detail.body.variants[0].inventory.onHand).toBe(8);
  });

  it('télécharge les photos des liens une fois, et les pose sur le produit et ses couleurs', async () => {
    const face = 'https://photos.example/iphone-15/face.png';
    const dos = 'https://photos.example/iphone-15/dos.png';
    const bleu = 'https://photos.example/iphone-15/bleu.png';
    const rose = 'https://photos.example/iphone-15/rose.png';
    for (const url of [face, dos, bleu, rose]) t.remoteImages.serve(url);
    const file = await workbook({
      PRODUCTS: [
        ['reference', 'titre', 'categorie', 'marque', 'statut', 'images'],
        ['IP15', 'iPhone 15', 'smartphones', 'Apple', 'brouillon', `${face} | ${dos}`],
      ],
      VARIANTS: [
        ['reference', 'sku', 'prix', 'image', 'stockage', 'couleur'],
        ['IP15', 'IP15-128-BLU', 480000, bleu, '128 Go', 'Bleu'],
        ['IP15', 'IP15-128-PNK', 480000, rose, '128 Go', 'Rose'],
      ],
    });

    const check = await upload(file, true);
    expect(check.body, JSON.stringify(check.body)).toMatchObject({ ok: true, summary: { images: 4 } });
    // La vérification ne télécharge rien.
    expect(t.remoteImages.requested).toHaveLength(0);

    const applied = await upload(file, false);
    expect(applied.status, JSON.stringify(applied.body)).toBe(200);
    expect(t.remoteImages.requested).toHaveLength(4);

    const list = await t.http().get('/api/v1/products').query({ q: 'iPhone 15' }).set(admin());
    const detail = await t.http().get(`/api/v1/products/${list.body.items[0].id}`).set(admin());
    const media = detail.body.media as { id: string; alt: string | null }[];
    expect(media).toHaveLength(4);
    expect(media[0]?.alt).toBe('iPhone 15');
    const blue = detail.body.variants.find((variant: { sku: string }) => variant.sku === 'IP15-128-BLU');
    expect(blue.image?.id).toBe(media[2]?.id);
    expect(detail.body.mediaOptionValues).toEqual({ [media[2]!.id]: 'Bleu', [media[3]!.id]: 'Rose' });

    // Réimporter le même fichier : les photos sont retrouvées, rien n'est retéléchargé ni dupliqué.
    const again = await upload(file, false);
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(t.remoteImages.requested).toHaveLength(4);
    const reread = await t.http().get(`/api/v1/products/${list.body.items[0].id}`).set(admin());
    expect(reread.body.media.map((m: { id: string }) => m.id)).toEqual(media.map((m) => m.id));
  });

  it('signale un lien non https ou une photo introuvable à sa ligne, sans rien écrire', async () => {
    const refused = await workbook({
      PRODUCTS: [
        ['reference', 'titre', 'categorie', 'images'],
        ['CASE1', 'Coque transparente', 'coques-pochettes', 'http://photos.example/coque.png'],
      ],
      VARIANTS: [
        ['reference', 'sku', 'prix', 'couleur'],
        ['CASE1', 'CASE1-CLR', 5000, 'Blanc'],
      ],
    });
    const check = await upload(refused, true);
    expect(check.body.ok).toBe(false);
    expect(check.body.issues).toEqual([expect.objectContaining({ sheet: 'PRODUCTS', row: 2, column: 'images' })]);

    const missing = await workbook({
      PRODUCTS: [
        ['reference', 'titre', 'categorie', 'images'],
        ['CASE2', 'Coque silicone', 'coques-pochettes', 'https://photos.example/introuvable.png'],
      ],
      VARIANTS: [
        ['reference', 'sku', 'prix', 'couleur'],
        ['CASE2', 'CASE2-BLK', 5000, 'Noir'],
      ],
    });
    const applied = await upload(missing, false);
    expect(applied.status).toBe(422);
    expect(applied.body.details.issues).toEqual([
      expect.objectContaining({ sheet: 'PRODUCTS', row: 2, column: 'images', message: expect.stringContaining('404') }),
    ]);
    const list = await t.http().get('/api/v1/products').query({ q: 'Coque silicone' }).set(admin());
    expect(list.body.items).toHaveLength(0);
  });
});
