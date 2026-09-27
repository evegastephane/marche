import { z } from 'zod';

/**
 * Contrat commun des réglages de thème (docs/PLAN-CODE.md P4-01).
 * Validé côté API (éditeur de thème) et consommé par le storefront, sans dépendance React.
 */

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { error: 'Couleur hexadécimale attendue (#RRGGBB)' });

export const FONT_CHOICES = [
  'Inter',
  'DM Sans',
  'Poppins',
  'Montserrat',
  'Nunito',
  'Space Grotesk',
  'Playfair Display',
  'Lora',
] as const;
export const fontSchema = z.enum(FONT_CHOICES);

export const themeColorsSchema = z.object({
  primary: hexColorSchema,
  background: hexColorSchema,
  foreground: hexColorSchema,
  accent: hexColorSchema,
});

/** Lien interne ("/collections/ete") ou externe en https. */
const linkSchema = z
  .string()
  .trim()
  .max(200)
  .refine((href) => href.startsWith('/') || href.startsWith('https://'), {
    error: 'Lien interne (/…) ou https:// attendu',
  });

const sectionBase = {
  /** Identifiant stable de la section (clé de rendu, réordonnancement). */
  id: z.string().trim().min(1).max(40),
  enabled: z.boolean().default(true),
};

export const heroSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('hero'),
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(300).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaHref: linkSchema.optional(),
  imageMediaId: z.uuid().nullable().default(null),
});

export const featuredCollectionSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('featured-collection'),
  title: z.string().trim().max(120).optional(),
  collectionId: z.uuid().nullable().default(null),
  limit: z.number().int().min(1).max(24).default(8),
});

export const productGridSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('product-grid'),
  title: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(48).default(12),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
});

export const brandStripSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('brand-strip'),
  title: z.string().trim().max(120).optional(),
});

export const richTextSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('rich-text'),
  title: z.string().trim().max(120).optional(),
  /** Markdown. */
  body: z.string().max(5000),
});

export const newsletterSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('newsletter'),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(300).optional(),
});

export const sectionSchema = z.discriminatedUnion('type', [
  heroSectionSchema,
  featuredCollectionSectionSchema,
  productGridSectionSchema,
  brandStripSectionSchema,
  richTextSectionSchema,
  newsletterSectionSchema,
]);
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section['type'];

export const themeSettingsBaseSchema = z.object({
  colors: themeColorsSchema,
  fonts: z.object({ heading: fontSchema, body: fontSchema }),
  logoMediaId: z.uuid().nullable().default(null),
  announcement: z.object({
    enabled: z.boolean().default(false),
    text: z.string().trim().max(160).default(''),
  }),
  sections: z
    .array(sectionSchema)
    .max(20)
    .refine((sections) => new Set(sections.map((s) => s.id)).size === sections.length, {
      error: 'Chaque section doit avoir un identifiant unique',
    }),
});
export type ThemeSettings = z.infer<typeof themeSettingsBaseSchema>;
