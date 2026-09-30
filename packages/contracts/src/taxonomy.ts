import { z } from 'zod';
import { resourceSlugSchema } from './common.js';

/**
 * Catégories et attributs définis par chaque boutique (catalogue dynamique).
 * Un attribut « axe de variante » fait varier prix et stock ; les autres décrivent le produit.
 */

export const ATTRIBUTE_TYPES = ['TEXT', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'BOOLEAN'] as const;
export const attributeTypeSchema = z.enum(ATTRIBUTE_TYPES);
export type AttributeType = z.infer<typeof attributeTypeSchema>;

export const ATTRIBUTE_TYPE_LABELS: Record<AttributeType, string> = {
  TEXT: 'Texte',
  NUMBER: 'Nombre',
  SELECT: 'Liste (un choix)',
  MULTI_SELECT: 'Liste (plusieurs choix)',
  BOOLEAN: 'Oui / non',
};

/** Profondeur maximale de l'arbre des catégories (Électronique › Audio › Casques › …). */
export const MAX_CATEGORY_DEPTH = 4;

/**
 * Numéro provisoire d'une unité reprise sans IMEI (stock d'avant le suivi à l'unité) :
 * le dashboard le signale « IMEI à saisir » et le commerçant le remplace.
 */
export const PLACEHOLDER_SERIAL_PREFIX = 'A-SAISIR-';

export function isPlaceholderSerial(serial: string): boolean {
  return serial.startsWith(PLACEHOLDER_SERIAL_PREFIX);
}

// ───────────── Catégories ─────────────

const categoryNameSchema = z.string().trim().min(1).max(80);

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  slug: resourceSlugSchema.optional(),
  parentId: z.uuid().nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
  /** Suivi à l'unité (IMEI, numéro de série), transmis aux sous-catégories. */
  tracksUnits: z.boolean().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: categoryNameSchema,
    slug: resourceSlugSchema,
    parentId: z.uuid().nullable(),
    position: z.number().int().min(0).max(10_000),
    tracksUnits: z.boolean(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, { error: 'Aucune modification fournie' });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** Attributs propres à une catégorie, dans l'ordre (ceux des parents s'y ajoutent). */
export const setCategoryAttributesSchema = z.object({
  attributes: z
    .array(z.object({ attributeId: z.uuid(), required: z.boolean().default(false) }))
    .max(60)
    .refine((links) => new Set(links.map((link) => link.attributeId)).size === links.length, {
      error: 'Un attribut ne figure qu’une fois',
    }),
});
export type SetCategoryAttributesInput = z.infer<typeof setCategoryAttributesSchema>;

export const categoryListQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
});
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;

export interface CategoryDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  position: number;
  /** Réglage propre à la catégorie. */
  tracksUnits: boolean;
  /** Suivi à l'unité effectif (la catégorie ou l'un de ses parents). */
  tracksUnitsEffective: boolean;
  /** Produits (non archivés) rangés directement dans la catégorie. */
  productsCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Attribut proposé par une catégorie, hérité ou propre, avec ses valeurs. */
export interface CategoryAttributeDto {
  id: string;
  slug: string;
  name: string;
  type: AttributeType;
  unit: string | null;
  isVariantAxis: boolean;
  filterable: boolean;
  required: boolean;
  inherited: boolean;
  /** Catégorie qui déclare l'attribut. */
  source: { id: string; name: string };
  values: { value: string; code: string; swatch: string | null }[];
}

export interface CategoryDetailDto extends CategoryDto {
  /** Chemin depuis la racine, la catégorie comprise. */
  path: { id: string; name: string; slug: string }[];
  attributes: CategoryAttributeDto[];
}

// ───────────── Attributs ─────────────

const attributeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Lettres minuscules, chiffres et tirets simples uniquement' });

export const attributeValueInputSchema = z.object({
  value: z.string().trim().min(1).max(80),
  /** Segment de SKU (Noir → BLK) ; calculé s'il est absent. */
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,16}$/, { error: 'Code : lettres majuscules et chiffres, 16 au plus' })
    .nullable()
    .optional(),
  swatch: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Pastille au format #RRGGBB' })
    .nullable()
    .optional(),
});
export type AttributeValueInput = z.infer<typeof attributeValueInputSchema>;

export const createAttributeSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    /** Clé dans la fiche des produits ; dérivée du nom si absente, figée ensuite. */
    slug: attributeSlugSchema.optional(),
    type: attributeTypeSchema,
    unit: z.string().trim().max(12).nullable().optional(),
    isVariantAxis: z.boolean().default(false),
    filterable: z.boolean().optional(),
    values: z.array(attributeValueInputSchema).max(300).default([]),
    /** Catégorie à laquelle rattacher tout de suite l'attribut (création depuis la fiche d'une catégorie). */
    categoryId: z.uuid().optional(),
    required: z.boolean().default(false),
  })
  .superRefine((input, ctx) => {
    if (input.type === 'NUMBER' && !input.unit) {
      ctx.addIssue({ code: 'custom', path: ['unit'], message: 'Un attribut nombre a toujours une unité (W, mAh, h…)' });
    }
    if (input.isVariantAxis && input.type !== 'SELECT') {
      ctx.addIssue({ code: 'custom', path: ['isVariantAxis'], message: 'Un axe de variante est une liste à un choix' });
    }
  });
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;

export const updateAttributeSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    unit: z.string().trim().max(12).nullable(),
    filterable: z.boolean(),
    position: z.number().int().min(0).max(10_000),
    type: attributeTypeSchema,
    isVariantAxis: z.boolean(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, { error: 'Aucune modification fournie' });
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;

export const updateAttributeValueSchema = attributeValueInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, { error: 'Aucune modification fournie' });
export type UpdateAttributeValueInput = z.infer<typeof updateAttributeValueSchema>;

export const reorderAttributeValuesSchema = z.object({ valueIds: z.array(z.uuid()).min(1).max(300) });
export type ReorderAttributeValuesInput = z.infer<typeof reorderAttributeValuesSchema>;

export const attributeListQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
  q: z.string().trim().min(1).max(60).optional(),
});
export type AttributeListQuery = z.infer<typeof attributeListQuerySchema>;

export interface AttributeValueDto {
  id: string;
  value: string;
  code: string;
  swatch: string | null;
  position: number;
}

export interface AttributeDto {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  unit: string | null;
  isVariantAxis: boolean;
  filterable: boolean;
  position: number;
  values: AttributeValueDto[];
  /** Catégories qui proposent l'attribut directement. */
  categories: { id: string; name: string; required: boolean }[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInstallDto {
  categories: number;
  attributes: number;
  values: number;
  links: number;
}
