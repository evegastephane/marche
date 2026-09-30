import { type AttributeType, valueCode, valueKey } from '@marche/contracts';
import { type CatalogTemplate, flattenTemplate } from './catalog-template.js';

/** Ce que la boutique possède déjà (catégories archivées comprises). */
export interface ExistingTaxonomy {
  categories: { id: string; slug: string }[];
  attributes: { id: string; slug: string; values: { value: string }[] }[];
  links: { categoryId: string; attributeId: string }[];
}

export interface TemplatePlan {
  attributes: {
    id: string;
    slug: string;
    name: string;
    type: AttributeType;
    unit: string | null;
    isVariantAxis: boolean;
    filterable: boolean;
    position: number;
  }[];
  values: { id: string; attributeId: string; value: string; code: string; swatch: string | null; position: number }[];
  categories: { id: string; parentId: string | null; slug: string; name: string; tracksUnits: boolean; position: number }[];
  links: { categoryId: string; attributeId: string; required: boolean; position: number }[];
}

/**
 * Fusionne un gabarit dans le catalogue d'une boutique : seul ce qui manque est ajouté
 * (catégories et attributs par slug, valeurs par libellé, liens par couple). Rien n'est modifié ni
 * supprimé : les réglages du commerçant priment, et l'opération peut être rejouée sans effet.
 */
export function planTemplate(template: CatalogTemplate, existing: ExistingTaxonomy, newId: () => string): TemplatePlan {
  const plan: TemplatePlan = { attributes: [], values: [], categories: [], links: [] };

  const attributeIds = new Map(existing.attributes.map((a) => [a.slug, a.id]));
  const existingValues = new Map(existing.attributes.map((a) => [a.id, new Set(a.values.map((v) => valueKey(v.value)))]));

  template.attributes.forEach((attribute, position) => {
    let id = attributeIds.get(attribute.slug);
    if (!id) {
      id = newId();
      attributeIds.set(attribute.slug, id);
      plan.attributes.push({
        id,
        slug: attribute.slug,
        name: attribute.name,
        type: attribute.type,
        unit: attribute.unit ?? null,
        isVariantAxis: attribute.isVariantAxis ?? false,
        filterable: attribute.filterable ?? false,
        position,
      });
    }
    const known = existingValues.get(id) ?? new Set<string>();
    const offset = known.size;
    (attribute.values ?? []).forEach((value, index) => {
      if (known.has(valueKey(value.value))) return;
      known.add(valueKey(value.value));
      plan.values.push({
        id: newId(),
        attributeId: id,
        value: value.value,
        code: value.code ?? valueCode(value.value),
        swatch: value.swatch ?? null,
        position: offset + index,
      });
    });
  });

  const categoryIds = new Map(existing.categories.map((c) => [c.slug, c.id]));
  const links = new Set(existing.links.map((l) => `${l.categoryId}|${l.attributeId}`));

  for (const { category, parentSlug, position } of flattenTemplate(template.categories)) {
    let id = categoryIds.get(category.slug);
    if (!id) {
      id = newId();
      categoryIds.set(category.slug, id);
      plan.categories.push({
        id,
        parentId: parentSlug ? (categoryIds.get(parentSlug) ?? null) : null,
        slug: category.slug,
        name: category.name,
        tracksUnits: category.tracksUnits ?? false,
        position,
      });
    }
    (category.attributes ?? []).forEach((link, index) => {
      const attributeId = attributeIds.get(link.slug);
      if (!attributeId) throw new Error(`Gabarit : attribut inconnu « ${link.slug} » (catégorie ${category.slug})`);
      const key = `${id}|${attributeId}`;
      if (links.has(key)) return;
      links.add(key);
      plan.links.push({ categoryId: id, attributeId, required: link.required ?? false, position: index });
    });
  }

  return plan;
}

export function isEmptyPlan(plan: TemplatePlan): boolean {
  return plan.attributes.length + plan.values.length + plan.categories.length + plan.links.length === 0;
}
