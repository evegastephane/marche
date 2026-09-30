import { describe, expect, it } from 'vitest';
import { CATALOG_TEMPLATES, flattenTemplate } from './catalog-template.js';
import { isEmptyPlan, planTemplate } from './plan-template.js';

let counter = 0;
const newId = () => `id-${++counter}`;
const empty = { categories: [], attributes: [], links: [] };

describe('planTemplate (catalogue de départ)', () => {
  it.each(Object.entries(CATALOG_TEMPLATES))('gabarit %s : slugs uniques, liens vers des attributs connus', (_, template) => {
    const slugs = flattenTemplate(template.categories).map((entry) => entry.category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const attributeSlugs = template.attributes.map((a) => a.slug);
    expect(new Set(attributeSlugs).size).toBe(attributeSlugs.length);
    // Règle 8 (nombre ⇒ unité) et axe ⇒ liste, comme les contraintes CHECK de la base.
    for (const attribute of template.attributes) {
      if (attribute.type === 'NUMBER') expect(attribute.unit, attribute.slug).toBeTruthy();
      if (attribute.isVariantAxis) expect(attribute.type, attribute.slug).toBe('SELECT');
    }
    expect(() => planTemplate(template, empty, newId)).not.toThrow();
  });

  it('pose tout le gabarit Électronique dans une boutique vide, parents avant enfants', () => {
    const plan = planTemplate(CATALOG_TEMPLATES.ELECTRONICS, empty, newId);
    const smartphones = plan.categories.find((c) => c.slug === 'smartphones');
    const root = plan.categories.find((c) => c.slug === 'electronique');
    expect(smartphones?.parentId).toBe(root?.id);
    expect(smartphones?.tracksUnits).toBe(true);
    const index = new Map(plan.categories.map((c, i) => [c.id, i]));
    for (const category of plan.categories) {
      if (category.parentId) expect(index.get(category.parentId)).toBeLessThan(index.get(category.id) ?? -1);
    }
    const stockage = plan.attributes.find((a) => a.slug === 'stockage');
    expect(plan.values.find((v) => v.attributeId === stockage?.id && v.value === '1 To')?.code).toBe('1T');
    expect(plan.links.find((l) => l.categoryId === smartphones?.id && l.attributeId === stockage?.id)?.required).toBe(true);
  });

  it('ne rajoute rien quand tout existe déjà : l’opération peut être rejouée', () => {
    const first = planTemplate(CATALOG_TEMPLATES.FASHION, empty, newId);
    const existing = {
      categories: first.categories.map(({ id, slug }) => ({ id, slug })),
      attributes: first.attributes.map(({ id, slug }) => ({
        id,
        slug,
        values: first.values.filter((v) => v.attributeId === id).map(({ value }) => ({ value })),
      })),
      links: first.links.map(({ categoryId, attributeId }) => ({ categoryId, attributeId })),
    };
    expect(isEmptyPlan(planTemplate(CATALOG_TEMPLATES.FASHION, existing, newId))).toBe(true);
  });

  it('garde les réglages du commerçant et ne complète que ce qui manque', () => {
    const existing = {
      categories: [{ id: 'mine', slug: 'vetements' }],
      attributes: [{ id: 'color', slug: 'couleur', values: [{ value: 'noir' }, { value: 'Fuchsia' }] }],
      links: [],
    };
    const plan = planTemplate(CATALOG_TEMPLATES.FASHION, existing, newId);
    expect(plan.categories.some((c) => c.slug === 'vetements')).toBe(false);
    expect(plan.attributes.some((a) => a.slug === 'couleur')).toBe(false);
    const added = plan.values.filter((v) => v.attributeId === 'color').map((v) => v.value);
    expect(added).not.toContain('Noir');
    expect(added).toContain('Blanc');
    expect(plan.links.some((l) => l.categoryId === 'mine' && l.attributeId === 'color')).toBe(true);
  });
});
