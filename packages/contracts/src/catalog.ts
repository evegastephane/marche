import { z } from 'zod';
import { amountSchema, paginationQuerySchema, resourceSlugSchema } from './common.js';
import type { MediaDto } from './media.js';

// ───────────── Constantes ─────────────

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const MAX_PRODUCT_OPTIONS = 3;
export const MAX_PRODUCT_VARIANTS = 100;
export const MAX_PRODUCT_MEDIA = 20;

// ───────────── Marques ─────────────

export const createBrandSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: resourceSlugSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  logoMediaId: z.uuid().nullable().optional(),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: resourceSlugSchema,
    description: z.string().trim().max(2000).nullable(),
    logoMediaId: z.uuid().nullable(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    error: 'Aucune modification fournie',
  });
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const brandListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  includeArchived: z.coerce.boolean().default(false),
});
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;

export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: MediaDto | null;
  productsCount: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ───────────── Produits ─────────────

export const skuSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    error: 'SKU : lettres, chiffres, points, tirets et soulignés uniquement',
  });

const optionValueSchema = z.string().trim().min(1).max(40);

export const productOptionSchema = z.object({
  name: z.string().trim().min(1).max(40),
  values: z.array(optionValueSchema).min(1).max(50),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

export const variantInputSchema = z.object({
  /** Présent pour une variante existante (mise à jour), absent pour une nouvelle. */
  id: z.uuid().optional(),
  sku: skuSchema,
  optionValues: z.array(optionValueSchema).max(MAX_PRODUCT_OPTIONS).default([]),
  priceAmount: amountSchema,
  compareAtAmount: amountSchema.nullable().optional(),
  trackInventory: z.boolean().default(true),
  /** Stock initial, pris en compte uniquement à la création de la variante. */
  initialQuantity: z.number().int().min(0).max(1_000_000).optional(),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

const productFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: resourceSlugSchema.optional(),
  description: z.string().max(20_000).nullable().optional(),
  brandId: z.uuid().nullable().optional(),
  options: z.array(productOptionSchema).max(MAX_PRODUCT_OPTIONS).default([]),
  variants: z.array(variantInputSchema).min(1).max(MAX_PRODUCT_VARIANTS),
  mediaIds: z.array(z.uuid()).max(MAX_PRODUCT_MEDIA).default([]),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
});

export const createProductSchema = productFieldsSchema;
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Mise à jour complète (le formulaire renvoie tout le produit) + version pour le verrou optimiste. */
export const updateProductSchema = productFieldsSchema.extend({
  version: z.number().int().min(0),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  status: productStatusSchema.optional(),
  brandId: z.uuid().optional(),
  collectionId: z.uuid().optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const bulkProductActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive']),
  productIds: z.array(z.uuid()).min(1).max(100),
});
export type BulkProductActionInput = z.infer<typeof bulkProductActionSchema>;

export interface InventorySummaryDto {
  onHand: number;
  reserved: number;
  available: number;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  title: string;
  optionValues: string[];
  priceAmount: number;
  compareAtAmount: number | null;
  position: number;
  trackInventory: boolean;
  archived: boolean;
  inventory: InventorySummaryDto | null;
}

export interface ProductDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  brand: { id: string; name: string } | null;
  options: ProductOption[];
  variants: ProductVariantDto[];
  media: MediaDto[];
  collections: { id: string; title: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItemDto {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus;
  brand: { id: string; name: string } | null;
  variantsCount: number;
  priceMinAmount: number;
  priceMaxAmount: number;
  thumbnail: MediaDto | null;
  updatedAt: string;
}

export interface BulkProductActionResultDto {
  succeeded: string[];
  failed: { productId: string; code: string; message: string }[];
}

// ───────────── Catalogues (collections) ─────────────

export const createCollectionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: resourceSlugSchema.optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  imageMediaId: z.uuid().nullable().optional(),
  isPublished: z.boolean().default(true),
  position: z.number().int().min(0).max(10_000).optional(),
});
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    slug: resourceSlugSchema,
    description: z.string().trim().max(5000).nullable(),
    imageMediaId: z.uuid().nullable(),
    isPublished: z.boolean(),
    position: z.number().int().min(0).max(10_000),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    error: 'Aucune modification fournie',
  });
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const setCollectionProductsSchema = z.object({
  productIds: z
    .array(z.uuid())
    .max(1000)
    .refine((ids) => new Set(ids).size === ids.length, {
      error: 'Un produit ne peut apparaître qu’une fois dans un catalogue',
    }),
});
export type SetCollectionProductsInput = z.infer<typeof setCollectionProductsSchema>;

export const collectionListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});
export type CollectionListQuery = z.infer<typeof collectionListQuerySchema>;

export interface CollectionDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image: MediaDto | null;
  isPublished: boolean;
  position: number;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetailDto extends CollectionDto {
  products: ProductListItemDto[];
}
