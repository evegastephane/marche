import type { TaxonomyCategory } from '@marche/contracts';
import { describe, expect, it } from 'vitest';
import { Attribute, AttributeInUseError, InvalidAttributeError } from './attribute.aggregate.js';
import { Category, CategoryInUseError, InvalidCategoryError } from './category.aggregate.js';

const now = new Date('2026-09-29T10:00:00Z');

const node = (id: string, parentId: string | null, tracksUnits = false): TaxonomyCategory => ({
  id,
  parentId,
  name: id,
  slug: id,
  tracksUnits,
});

/** Électronique › Audio › Casques › Sans fil (4 niveaux), et Smartphones. */
const TREE: TaxonomyCategory[] = [
  node('root', null),
  node('audio', 'root'),
  node('casques', 'audio'),
  node('sans-fil', 'casques'),
  node('phones', 'root', true),
];

const existing = (id: string) => {
  const found = TREE.find((category) => category.id === id);
  if (!found) throw new Error(id);
  return Category.reconstitute(id, {
    storeId: 's1',
    parentId: found.parentId,
    name: found.name,
    slug: found.slug,
    position: 0,
    tracksUnits: found.tracksUnits,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
};

describe('Category', () => {
  it('se crée sous un parent actif, à la suite de ses sœurs', () => {
    const category = Category.create('s1', { name: ' Enceintes ', slug: 'enceintes', parentId: 'audio' }, TREE, now);
    expect(category.snapshot()).toMatchObject({ name: 'Enceintes', parentId: 'audio', position: 1 });
    expect(category.pullEvents()[0]?.type).toBe('catalog.category.created');
  });

  it('refuse un parent inconnu et une branche trop profonde', () => {
    expect(() => Category.create('s1', { name: 'X', slug: 'x', parentId: 'nope' }, TREE, now)).toThrow(InvalidCategoryError);
    expect(() => Category.create('s1', { name: 'X', slug: 'x', parentId: 'sans-fil' }, TREE, now)).toThrow(/4 niveaux/);
  });

  it('ne se range ni sous elle-même ni sous l’une de ses sous-catégories', () => {
    expect(() => existing('audio').update({ parentId: 'audio' }, TREE, now)).toThrow(InvalidCategoryError);
    expect(() => existing('audio').update({ parentId: 'sans-fil' }, TREE, now)).toThrow(/sous-catégories/);
  });

  it('se déplace si toute sa branche tient dans la profondeur maximale', () => {
    // Casques (2 niveaux de branche) sous Smartphones : niveau 2 + 2 = 4, accepté.
    const casques = existing('casques');
    casques.update({ parentId: 'phones' }, TREE, now);
    expect(casques.parentId).toBe('phones');
    // Audio (3 niveaux de branche) sous Smartphones : 2 + 3 = 5, refusé.
    expect(() => existing('audio').update({ parentId: 'phones' }, TREE, now)).toThrow(/4 niveaux/);
  });

  it('ne s’archive pas tant qu’elle porte des produits ou des sous-catégories', () => {
    expect(() => existing('audio').archive({ products: 0, children: 1 }, now)).toThrow(CategoryInUseError);
    expect(() => existing('casques').archive({ products: 3, children: 0 }, now)).toThrow(/3 produits/);
    const empty = existing('sans-fil');
    empty.archive({ products: 0, children: 0 }, now);
    expect(empty.isArchived).toBe(true);
  });
});

describe('Attribute', () => {
  const create = (input: Partial<Parameters<typeof Attribute.create>[1]> = {}) =>
    Attribute.create('s1', { name: 'Couleur', type: 'SELECT', isVariantAxis: true, values: [{ value: 'Noir', code: 'blk' }, { value: 'Bleu nuit' }], ...input }, now);

  it('dérive son slug du nom et calcule les codes SKU manquants', () => {
    const attribute = create({ name: 'Taille écran', type: 'NUMBER', unit: 'pouces', isVariantAxis: false, values: [] });
    expect(attribute.slug).toBe('taille-ecran');
    const colors = create().snapshot().values;
    expect(colors.map((v) => [v.value, v.code])).toEqual([
      ['Noir', 'BLK'],
      ['Bleu nuit', 'BLN'],
    ]);
  });

  it.each([
    ['nombre sans unité (règle 8)', { type: 'NUMBER' as const, isVariantAxis: false, values: [] }],
    ['axe qui n’est pas une liste à un choix', { type: 'MULTI_SELECT' as const }],
    ['valeur en double', { values: [{ value: 'Noir' }, { value: ' noir ' }] }],
    ['pastille mal formée', { values: [{ value: 'Noir', swatch: 'noir' }] }],
  ])('refuse : %s', (_, input) => {
    expect(() => create(input)).toThrow(InvalidAttributeError);
  });

  it('fige son type et son rôle d’axe dès qu’il sert', () => {
    expect(() => create().update({ type: 'MULTI_SELECT', isVariantAxis: false }, true, now)).toThrow(AttributeInUseError);
    const free = create();
    free.update({ type: 'MULTI_SELECT', isVariantAxis: false }, false, now);
    expect(free.type).toBe('MULTI_SELECT');
  });

  it('renomme une valeur en signalant l’ancien libellé, refuse de supprimer une valeur utilisée', () => {
    const attribute = create();
    const noir = attribute.snapshot().values[0];
    expect(attribute.updateValue(noir?.id ?? '', { value: 'Noir sidéral' }, now).renamedFrom).toBe('Noir');
    expect(attribute.updateValue(noir?.id ?? '', { code: 'NSD' }, now).renamedFrom).toBeNull();
    expect(() => attribute.removeValue(noir?.id ?? '', true, now)).toThrow(AttributeInUseError);
    attribute.removeValue(noir?.id ?? '', false, now);
    expect(attribute.snapshot().values.map((v) => [v.value, v.position])).toEqual([['Bleu nuit', 0]]);
  });

  it('réordonne ses valeurs en citant chacune une fois', () => {
    const attribute = create();
    const [noir, bleu] = attribute.snapshot().values;
    attribute.reorderValues([bleu?.id ?? '', noir?.id ?? ''], now);
    expect(attribute.snapshot().values.map((v) => v.value)).toEqual(['Bleu nuit', 'Noir']);
    expect(() => attribute.reorderValues([bleu?.id ?? ''], now)).toThrow(InvalidAttributeError);
  });
});
