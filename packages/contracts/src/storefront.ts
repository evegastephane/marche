import { z } from 'zod';
import { type Currency, paginationQuerySchema } from './common.js';
import type { BundleDiscountType, ProductOption } from './catalog.js';
import type { MediaDto } from './media.js';
import type { ThemeSettings } from './templates/theme.js';
import {
  type OptionType,
  type ProductAttributes,
  type ProductKind,
  productKindSchema,
  type SizeGuide,
  type StoreType,
} from './verticals.js';

/** Paramètre répétable « type:valeur » (ex. o=size:M&o=color:Bleu), normalisé en liste. */
const facetPairs = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .pipe(z.array(z.string().regex(/^[A-Za-z_]{1,40}:.{1,40}$/)).max(20));

/** En-têtes posés par le storefront (appels serveur à serveur uniquement). */
export const STOREFRONT_HEADERS = {
  token: 'x-storefront-token',
  storeHost: 'x-store-host',
  previewToken: 'x-preview-token',
  clientIp: 'x-client-ip',
} as const;

export const storefrontProductListQuerySchema = paginationQuerySchema.extend({
  collection: z.string().trim().min(1).max(100).optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  /** featured : ordre choisi par le marchand dans le catalogue (sinon les plus récents d'abord). */
  sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc']).default('featured'),
  kind: productKindSchema.optional(),
  /** Options : o=size:M, o=color:Bleu, o=storage:256 Go (valeurs d'un même type = « ou »). */
  o: facetPairs,
  /** Attributs filtrables : a=audience:FEMME, a=accessoryType:CHARGER. */
  a: facetPairs,
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
});
export type StorefrontProductListQuery = z.infer<typeof storefrontProductListQuerySchema>;
export type StorefrontSort = StorefrontProductListQuery['sort'];

export const storefrontFacetsQuerySchema = z.object({
  collection: z.string().trim().min(1).max(100).optional(),
  kind: productKindSchema.optional(),
});
export type StorefrontFacetsQuery = z.infer<typeof storefrontFacetsQuerySchema>;

/** Valeurs disponibles pour chaque filtre du site, avec le nombre de produits. */
export interface StorefrontFacetsDto {
  kinds: { value: ProductKind; label: string; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  options: { type: OptionType; label: string; values: { value: string; swatch: string | null; count: number }[] }[];
  attributes: { key: string; label: string; values: { value: string; label: string; count: number }[] }[];
  price: { min: number; max: number } | null;
}

export const availabilityQuerySchema = z.object({
  variantIds: z
    .string()
    .transform((raw) => raw.split(',').map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(100)),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export interface StorefrontStoreDto {
  /** Identifiant de la boutique : sert aux tags de cache (store:{id}, catalog:{id}). */
  id: string;
  name: string;
  slug: string;
  currency: Currency;
  contactEmail: string | null;
  phone: string | null;
  logo: MediaDto | null;
  /** Mode ou Électronique : le site adapte la fiche produit et les filtres. */
  type: StoreType;
  /** Guides des tailles de la boutique (ou ceux par défaut), affichés sur les fiches Mode. */
  sizeGuides: { CLOTHING: SizeGuide; SHOES: SizeGuide };
  templateId: string;
  templateVersion: string;
  theme: ThemeSettings;
  /** Médias référencés par le thème (hero, logo), résolus en URL. */
  themeMedia: Record<string, MediaDto>;
  navigation: { collections: { title: string; slug: string }[] };
  hasProducts: boolean;
  preview: boolean;
}

export interface StorefrontProductCardDto {
  id: string;
  title: string;
  slug: string;
  brand: { name: string; slug: string } | null;
  priceMinAmount: number;
  priceMaxAmount: number;
  compareAtAmount: number | null;
  image: MediaDto | null;
  kind: ProductKind | null;
  /** Pastilles de couleur de l'article (option de type « color »). */
  swatches: { value: string; hex: string }[];
}

export interface StorefrontVariantDto {
  id: string;
  title: string;
  optionValues: string[];
  priceAmount: number;
  compareAtAmount: number | null;
  sku: string;
}

/** Accessoire proposé avec un appareil (ou article d'un pack). */
export interface StorefrontAccessoryDto extends StorefrontProductCardDto {
  /** Déclinaison ajoutée d'un geste ; null si l'accessoire a plusieurs déclinaisons (choix sur sa fiche). */
  variantId: string | null;
  /** Déclinaisons vendables, pour choisir sans quitter la fiche (taille, couleur…). */
  variants: { id: string; title: string; priceAmount: number }[];
  attributes: ProductAttributes;
}

export interface StorefrontBundleDto {
  id: string;
  title: string;
  discountType: BundleDiscountType;
  discountValue: number;
  items: StorefrontAccessoryDto[];
}

export interface StorefrontProductDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand: { name: string; slug: string } | null;
  kind: ProductKind | null;
  attributes: ProductAttributes;
  options: ProductOption[];
  variants: StorefrontVariantDto[];
  images: MediaDto[];
  /** Photo → valeur d'option (couleur) : la galerie suit la couleur choisie. */
  imageOptionValues: Record<string, string>;
  /** Accessoires : choisis par la boutique, puis compatibles avec le modèle. */
  accessories: StorefrontAccessoryDto[];
  bundles: StorefrontBundleDto[];
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface StorefrontCollectionDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image: MediaDto | null;
}

export interface StorefrontBrandDto {
  name: string;
  slug: string;
  logo: MediaDto | null;
}

export interface AvailabilityDto {
  variants: { variantId: string; available: number | null }[];
}
