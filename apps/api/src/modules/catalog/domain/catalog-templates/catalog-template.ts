import type { AttributeType, StoreType } from '@marche/contracts';
import { ELECTRONICS_TEMPLATE } from './electronics.js';
import { FASHION_TEMPLATE } from './fashion.js';

/**
 * Catalogue de départ d'une boutique (catégories, attributs, valeurs), selon son type.
 * Appliqué une fois par boutique, puis librement modifié par le commerçant depuis le dashboard.
 */

export interface TemplateValue {
  value: string;
  /** Segment de SKU ; à défaut, valueCode(value). */
  code?: string;
  swatch?: string;
}

export interface TemplateAttribute {
  slug: string;
  name: string;
  type: AttributeType;
  unit?: string;
  isVariantAxis?: boolean;
  filterable?: boolean;
  values?: TemplateValue[];
}

export interface TemplateCategoryAttribute {
  slug: string;
  required?: boolean;
}

export interface TemplateCategory {
  slug: string;
  name: string;
  tracksUnits?: boolean;
  attributes?: TemplateCategoryAttribute[];
  children?: TemplateCategory[];
}

export interface CatalogTemplate {
  attributes: TemplateAttribute[];
  categories: TemplateCategory[];
}

export const CATALOG_TEMPLATES: Record<StoreType, CatalogTemplate> = {
  ELECTRONICS: ELECTRONICS_TEMPLATE,
  FASHION: FASHION_TEMPLATE,
};

/** Catégories d'un gabarit à plat (parents avant enfants), avec le slug de leur parent. */
export function flattenTemplate(
  categories: readonly TemplateCategory[],
  parentSlug: string | null = null,
): { category: TemplateCategory; parentSlug: string | null; position: number }[] {
  return categories.flatMap((category, position) => [
    { category, parentSlug, position },
    ...flattenTemplate(category.children ?? [], category.slug),
  ]);
}
