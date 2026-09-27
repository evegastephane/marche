import { describe, expect, it } from 'vitest';
import { InvalidProductError, ProductNotPublishableError } from './catalog.errors.js';
import { Product, type ProductDraft, variantCombinations } from './product.aggregate.js';

const now = new Date('2026-09-27T10:00:00Z');

const draft = (overrides: Partial<ProductDraft> = {}): ProductDraft => ({
  title: 'T-shirt',
  slug: 't-shirt',
  options: [
    { name: 'Taille', values: ['S', 'M'] },
    { name: 'Couleur', values: ['Noir'] },
  ],
  variants: [
    { sku: 'TS-S', optionValues: ['S', 'Noir'], priceAmount: 1500, trackInventory: true, initialQuantity: 4 },
    { sku: 'TS-M', optionValues: ['M', 'Noir'], priceAmount: 1500, trackInventory: true },
  ],
  mediaIds: [],
  ...overrides,
});

describe('Product', () => {
  it('se crée en brouillon et annonce ses nouvelles variantes pour le stock initial', () => {
    const { product, newVariants } = Product.create('s1', draft(), now);
    expect(product.status).toBe('DRAFT');
    expect(product.variants.map((v) => v.title)).toEqual(['S / Noir', 'M / Noir']);
    expect(newVariants.map((v) => v.initialQuantity)).toEqual([4, 0]);
    expect(product.pullEvents()[0]?.type).toBe('catalog.product.created');
  });

  it.each([
    ['option en double', { options: [{ name: 'Taille', values: ['S'] }, { name: 'taille', values: ['M'] }] }],
    ['combinaison en double', {
      variants: [
        { sku: 'A', optionValues: ['S', 'Noir'], priceAmount: 1, trackInventory: true },
        { sku: 'B', optionValues: ['s', 'noir'], priceAmount: 1, trackInventory: true },
      ],
    }],
    ['valeur hors option', { variants: [{ sku: 'A', optionValues: ['XL', 'Noir'], priceAmount: 1, trackInventory: true }] }],
    ['SKU en double', {
      variants: [
        { sku: 'A', optionValues: ['S', 'Noir'], priceAmount: 1, trackInventory: true },
        { sku: 'a', optionValues: ['M', 'Noir'], priceAmount: 1, trackInventory: true },
      ],
    }],
    ['plusieurs variantes sans option', {
      options: [],
      variants: [
        { sku: 'A', optionValues: [], priceAmount: 1, trackInventory: true },
        { sku: 'B', optionValues: [], priceAmount: 1, trackInventory: true },
      ],
    }],
    ['prix décimal', { options: [], variants: [{ sku: 'A', optionValues: [], priceAmount: 9.99, trackInventory: true }] }],
  ])('refuse : %s', (_label, overrides) => {
    expect(() => Product.create('s1', draft(overrides as Partial<ProductDraft>), now)).toThrow(InvalidProductError);
  });

  it('archive les variantes retirées au lieu de les supprimer', () => {
    const { product } = Product.create('s1', draft(), now);
    const [small] = product.variants;
    const newVariants = product.update(
      draft({
        options: [{ name: 'Taille', values: ['S', 'L'] }, { name: 'Couleur', values: ['Noir'] }],
        variants: [
          { id: small?.id, sku: 'TS-S', optionValues: ['S', 'Noir'], priceAmount: 1700, trackInventory: true },
          { sku: 'TS-L', optionValues: ['L', 'Noir'], priceAmount: 1700, trackInventory: true, initialQuantity: 2 },
        ],
      }),
      now,
    );
    expect(newVariants).toHaveLength(1);
    expect(product.activeVariants.map((v) => v.sku)).toEqual(['TS-S', 'TS-L']);
    expect(product.variants.filter((v) => v.isArchived).map((v) => v.sku)).toEqual(['TS-M']);
  });

  it('publie (R3), puis dépublie et archive', () => {
    const { product } = Product.create('s1', draft(), now);
    product.publish(now);
    expect(product.status).toBe('ACTIVE');
    product.unpublish(now);
    expect(product.status).toBe('DRAFT');
    product.archive(now);
    expect(product.status).toBe('ARCHIVED');
    expect(product.pullEvents().map((e) => e.type)).toEqual([
      'catalog.product.created',
      'catalog.product.published',
      'catalog.product.unpublished',
      'catalog.product.archived',
    ]);
  });

  it('refuse de publier sans variante active', () => {
    const { product } = Product.create('s1', draft({ options: [], variants: [{ sku: 'A', optionValues: [], priceAmount: 1, trackInventory: true }] }), now);
    // Situation impossible via update (une variante minimum) mais protégée par l'agrégat.
    (product as unknown as { data: { variants: unknown[] } }).data.variants = [];
    expect(() => product.publish(now)).toThrow(ProductNotPublishableError);
  });

  it('duplique en brouillon avec de nouveaux identifiants et des SKU réécrits', () => {
    const { product } = Product.create('s1', draft(), now);
    product.publish(now);
    const { product: copy } = product.duplicate({ slug: 't-shirt-copie', skuFor: (sku) => `${sku}-COPIE`, now });
    expect(copy.status).toBe('DRAFT');
    expect(copy.snapshot().title).toBe('T-shirt (copie)');
    expect(copy.variants.map((v) => v.sku)).toEqual(['TS-S-COPIE', 'TS-M-COPIE']);
    expect(copy.variants[0]?.id).not.toBe(product.variants[0]?.id);
  });

  it('calcule toutes les combinaisons d’options', () => {
    expect(
      variantCombinations([
        { name: 'Taille', values: ['S', 'M'] },
        { name: 'Couleur', values: ['Noir', 'Or'] },
      ]),
    ).toEqual([['S', 'Noir'], ['S', 'Or'], ['M', 'Noir'], ['M', 'Or']]);
    expect(variantCombinations([])).toEqual([[]]);
  });
});
