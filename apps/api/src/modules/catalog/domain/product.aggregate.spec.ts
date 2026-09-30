import type { EffectiveAttribute, TaxonomyValue } from '@marche/contracts';
import { describe, expect, it } from 'vitest';
import { InvalidProductError, ProductNotPublishableError } from './catalog.errors.js';
import { type CategoryContext, Product, type ProductDraft } from './product.aggregate.js';

const now = new Date('2026-09-29T10:00:00Z');

const values = (...list: string[]): TaxonomyValue[] => list.map((value) => ({ value, code: value.slice(0, 3).toUpperCase(), swatch: null }));
const attribute = (slug: string, extra: Partial<EffectiveAttribute>): EffectiveAttribute => ({
  id: `a-${slug}`,
  slug,
  name: slug,
  type: 'SELECT',
  unit: null,
  isVariantAxis: false,
  filterable: false,
  values: [],
  required: false,
  sourceCategoryId: 'phones',
  inherited: false,
  ...extra,
});

/** Smartphones : Stockage*, Couleur*, État (axes), Taille écran, Réseau* (fiche), suivi à l'unité. */
const phones: CategoryContext = {
  categoryId: 'phones',
  tracksUnits: true,
  attributes: [
    attribute('stockage', { isVariantAxis: true, required: true, values: values('256 Go', '512 Go', '1 To') }),
    attribute('couleur', { isVariantAxis: true, required: true, values: values('Noir', 'Argent', 'Orange') }),
    attribute('etat', { isVariantAxis: true, values: values('Neuf', 'Occasion') }),
    attribute('taille-ecran', { type: 'NUMBER', unit: 'pouces' }),
    attribute('reseau', { required: true, values: values('4G', '5G') }),
  ],
};

/** Apple Pencil : aucun axe, pas de suivi à l'unité. */
const pencils: CategoryContext = { categoryId: 'pencils', tracksUnits: false, attributes: [] };

const draft = (overrides: Partial<ProductDraft> = {}): ProductDraft => ({
  title: 'iPhone 17 Pro',
  slug: 'iphone-17-pro',
  reference: 'ip17p',
  specs: { 'taille-ecran': 6.3, reseau: '5g' },
  variants: [
    {
      sku: 'IP17P-256-BLK',
      options: { stockage: '256 Go', couleur: 'noir' },
      priceAmount: 1_050_000,
      trackInventory: true,
      units: [{ serial: '356 938 035 643 809' }, { serial: '356938035643817', batteryHealth: 100 }],
    },
    { sku: 'IP17P-512-ORG', options: { stockage: '512 Go', couleur: 'Orange' }, priceAmount: 1_250_000, trackInventory: true },
  ],
  mediaIds: [],
  ...overrides,
});

describe('Product (catalogue dynamique)', () => {
  it('se crée en brouillon, dans sa catégorie, avec fiche et variantes ramenées aux libellés enregistrés', () => {
    const { product, newVariants } = Product.create('s1', draft(), phones, now);
    const data = product.snapshot();
    expect(product.status).toBe('DRAFT');
    expect(data.categoryId).toBe('phones');
    expect(data.reference).toBe('IP17P');
    expect(data.specs).toEqual({ 'taille-ecran': 6.3, reseau: '5G' });
    expect(product.variants.map((v) => v.title)).toEqual(['256 Go / Noir', '512 Go / Orange']);
    expect(product.variants[0]?.options).toEqual({ stockage: '256 Go', couleur: 'Noir' });
    expect(product.pullEvents()[0]?.type).toBe('catalog.product.created');
    // Suivi à l'unité : le stock initial est le nombre d'IMEI saisis.
    expect(newVariants.map((v) => v.initialQuantity)).toEqual([2, 0]);
    expect(newVariants[0]?.units.map((u) => u.serial)).toEqual(['356938035643809', '356938035643817']);
    expect(newVariants.every((v) => v.tracksUnits)).toBe(true);
  });

  it('un produit sans axe n’a qu’une variante par défaut (règle 3)', () => {
    const { product } = Product.create(
      's1',
      {
        title: 'Apple Pencil Pro',
        slug: 'apple-pencil-pro',
        variants: [{ sku: 'APPENCILPRO', options: {}, priceAmount: 95_000, trackInventory: true, initialQuantity: 5 }],
        mediaIds: [],
      },
      pencils,
      now,
    );
    expect(product.variants.map((v) => v.title)).toEqual(['Par défaut']);
    expect(() =>
      Product.create(
        's1',
        {
          title: 'Apple Pencil Pro',
          slug: 'apple-pencil-pro',
          variants: [
            { sku: 'A', options: {}, priceAmount: 1, trackInventory: true },
            { sku: 'B', options: {}, priceAmount: 1, trackInventory: true },
          ],
          mediaIds: [],
        },
        pencils,
        now,
      ),
    ).toThrow(InvalidProductError);
  });

  it.each([
    ['axe inconnu de la catégorie', { variants: [{ sku: 'A', options: { ram: '8 Go' }, priceAmount: 1, trackInventory: true }] }],
    ['valeur hors liste', { variants: [{ sku: 'A', options: { stockage: '2 To', couleur: 'Noir' }, priceAmount: 1, trackInventory: true }] }],
    [
      'combinaison en double',
      {
        variants: [
          { sku: 'A', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true },
          { sku: 'B', options: { couleur: 'noir', stockage: '256 GO' }, priceAmount: 1, trackInventory: true },
        ],
      },
    ],
    [
      'axes différents d’une variante à l’autre',
      {
        variants: [
          { sku: 'A', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true },
          { sku: 'B', options: { stockage: '512 Go' }, priceAmount: 1, trackInventory: true },
        ],
      },
    ],
    [
      'SKU en double',
      {
        variants: [
          { sku: 'ip17p', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true },
          { sku: 'IP17P', options: { stockage: '512 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true },
        ],
      },
    ],
    [
      'stock d’un appareil suivi sans IMEI',
      { variants: [{ sku: 'A', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true, initialQuantity: 3 }] },
    ],
    [
      'IMEI en double',
      {
        variants: [
          {
            sku: 'A',
            options: { stockage: '256 Go', couleur: 'Noir' },
            priceAmount: 1,
            trackInventory: true,
            units: [{ serial: '356938035643809' }, { serial: '356 938 035 643 809' }],
          },
        ],
      },
    ],
    ['fiche technique du mauvais type', { specs: { 'taille-ecran': '6,3 pouces' } }],
    ['valeur de fiche hors liste', { specs: { reseau: '3G' } }],
    ['prix négatif', { variants: [{ sku: 'A', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: -1, trackInventory: true }] }],
  ])('refuse : %s', (_, overrides) => {
    expect(() => Product.create('s1', draft(overrides as Partial<ProductDraft>), phones, now)).toThrow(InvalidProductError);
  });

  it('refuse des IMEI dans une catégorie non suivie à l’unité', () => {
    expect(() =>
      Product.create(
        's1',
        {
          title: 'Câble',
          slug: 'cable',
          variants: [{ sku: 'C', options: {}, priceAmount: 1, trackInventory: true, units: [{ serial: 'ABC123' }] }],
          mediaIds: [],
        },
        pencils,
        now,
      ),
    ).toThrow(InvalidProductError);
  });

  it('dérive l’état des unités de l’axe État', () => {
    const { newVariants } = Product.create(
      's1',
      draft({
        variants: [
          {
            sku: 'U',
            options: { stockage: '256 Go', couleur: 'Noir', etat: 'Occasion' },
            priceAmount: 400_000,
            trackInventory: true,
            units: [{ serial: 'SN001', batteryHealth: 88 }],
          },
          { sku: 'N', options: { stockage: '256 Go', couleur: 'Argent', etat: 'Neuf' }, priceAmount: 1, trackInventory: true },
        ],
      }),
      phones,
      now,
    );
    expect(newVariants.map((v) => v.condition)).toEqual(['USED', 'NEW']);
  });

  describe('publication (règle 10)', () => {
    it('bloque tant qu’un attribut obligatoire est vide', () => {
      const { product } = Product.create('s1', draft({ specs: { 'taille-ecran': 6.3 } }), phones, now);
      expect(product.publishProblems(phones).map((p) => p.message)).toEqual(['reseau est obligatoire']);
      expect(() => product.publish(phones, now)).toThrow(ProductNotPublishableError);
      expect(product.status).toBe('DRAFT');
    });

    it('bloque tant qu’un axe obligatoire n’a pas de valeur', () => {
      const withoutColor: CategoryContext = {
        ...phones,
        attributes: phones.attributes.map((a) => (a.slug === 'couleur' ? { ...a, required: true } : a)),
      };
      const { product } = Product.create(
        's1',
        draft({
          variants: [{ sku: 'A', options: { stockage: '256 Go' }, priceAmount: 1, trackInventory: true }],
        }),
        withoutColor,
        now,
      );
      expect(product.publishProblems(withoutColor).map((p) => p.message)).toEqual(['couleur : cochez au moins une valeur']);
    });

    it('publie un produit complet, et un produit en vente doit le rester', () => {
      const { product } = Product.create('s1', draft(), phones, now);
      product.publish(phones, now);
      expect(product.status).toBe('ACTIVE');
      const variants = product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        options: { ...variant.options },
        priceAmount: variant.priceAmount,
        trackInventory: true,
      }));
      expect(() => product.update(draft({ specs: {}, variants }), phones, now)).toThrow(ProductNotPublishableError);
    });
  });

  describe('mise à jour', () => {
    it('archive la combinaison décochée et la réactive (même variante) quand on la recoche', () => {
      const { product } = Product.create('s1', draft(), phones, now);
      const [black, orange] = product.variants;
      const only = draft({ variants: [{ id: black?.id, sku: 'IP17P-256-BLK', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true }] });
      expect(product.update(only, phones, now)).toEqual([]);
      expect(product.activeVariants.map((v) => v.id)).toEqual([black?.id]);
      expect(product.variants.find((v) => v.id === orange?.id)?.isArchived).toBe(true);

      const again = product.update(
        draft({
          variants: [
            { id: black?.id, sku: 'IP17P-256-BLK', options: { stockage: '256 Go', couleur: 'Noir' }, priceAmount: 1, trackInventory: true },
            { sku: 'IP17P-512-ORG', options: { stockage: '512 Go', couleur: 'Orange' }, priceAmount: 1, trackInventory: true },
          ],
        }),
        phones,
        now,
      );
      expect(again.map((v) => v.variantId)).toEqual([orange?.id]);
      expect(product.activeVariants).toHaveLength(2);
    });

    it('refuse des IMEI sur une variante existante (ils s’ajoutent depuis le stock)', () => {
      const { product } = Product.create('s1', draft(), phones, now);
      const [black] = product.variants;
      expect(() =>
        product.update(
          draft({
            variants: [
              {
                id: black?.id,
                sku: 'IP17P-256-BLK',
                options: { stockage: '256 Go', couleur: 'Noir' },
                priceAmount: 1,
                trackInventory: true,
                units: [{ serial: 'SN999' }],
              },
            ],
          }),
          phones,
          now,
        ),
      ).toThrow(InvalidProductError);
    });
  });

  it('se duplique en brouillon, SKU réécrits, sans référence ni stock', () => {
    const { product } = Product.create('s1', draft(), phones, now);
    const { product: copy, newVariants } = product.duplicate({
      slug: 'iphone-17-pro-copie',
      skuFor: (sku) => `${sku}-COPIE`,
      context: phones,
      now,
    });
    expect(copy.status).toBe('DRAFT');
    expect(copy.snapshot().reference).toBeNull();
    expect(copy.variants.map((v) => v.sku)).toEqual(['IP17P-256-BLK-COPIE', 'IP17P-512-ORG-COPIE']);
    expect(newVariants.every((v) => v.initialQuantity === 0)).toBe(true);
  });
});
