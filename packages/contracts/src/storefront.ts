import { z } from 'zod';
import { type Currency, paginationQuerySchema } from './common.js';
import type { ProductOption } from './catalog.js';
import type { MediaDto } from './media.js';
import type { ThemeSettings } from './templates/theme.js';

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
});
export type StorefrontProductListQuery = z.infer<typeof storefrontProductListQuerySchema>;
export type StorefrontSort = StorefrontProductListQuery['sort'];

export const availabilityQuerySchema = z.object({
  variantIds: z
    .string()
    .transform((raw) => raw.split(',').map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(100)),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export interface StorefrontStoreDto {
  name: string;
  slug: string;
  currency: Currency;
  contactEmail: string | null;
  phone: string | null;
  logo: MediaDto | null;
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
}

export interface StorefrontVariantDto {
  id: string;
  title: string;
  optionValues: string[];
  priceAmount: number;
  compareAtAmount: number | null;
  sku: string;
}

export interface StorefrontProductDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand: { name: string; slug: string } | null;
  options: ProductOption[];
  variants: StorefrontVariantDto[];
  images: MediaDto[];
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
