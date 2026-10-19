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

/**
 * Rôles de couleur d'une palette. Chaque template les interprète dans son monde
 * (papier et encre, comptoir et étiquette, mur et panneau), mais tous ont les mêmes rôles.
 */
export const paletteColorsSchema = z.object({
  /** Fond de page. */
  background: hexColorSchema,
  /** Texte posé sur le fond. */
  foreground: hexColorSchema,
  /** Texte secondaire sur le fond. */
  muted: hexColorSchema,
  /** Panneaux, cartes, étiquettes. */
  surface: hexColorSchema,
  /** Texte posé sur les panneaux. */
  surfaceForeground: hexColorSchema,
  /** Filets et séparations. */
  line: hexColorSchema,
  /** Action principale (Ajouter au panier, Commander). */
  primary: hexColorSchema,
  /** Mise en avant (annonce, état, écriture manuscrite…). */
  accent: hexColorSchema,
});
export type PaletteColors = z.infer<typeof paletteColorsSchema>;

/** Palette préréglée d'un template : le marchand choisit parmi elles, jamais une couleur libre. */
export interface Palette {
  id: string;
  name: string;
  colors: PaletteColors;
}

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

/**
 * Sélection mise en avant : les produits d'une catégorie (sous-catégories comprises).
 * `collectionId` reste lu pour les sites créés quand les catalogues existaient encore dans le dashboard.
 */
export const featuredCollectionSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('featured-collection'),
  title: z.string().trim().max(120).optional(),
  categoryId: z.uuid().nullable().default(null),
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

/** Gardée pour les anciens réglages ; l'éditeur ne la propose plus (aucun envoi derrière). */
export const newsletterSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('newsletter'),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(300).optional(),
});

/** Une photo à côté d'un titre et d'un texte (histoire, savoir-faire, atelier). */
export const imageTextSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('image-text'),
  title: z.string().trim().max(120).optional(),
  /** Texte simple ; les sauts de ligne séparent les paragraphes. */
  body: z.string().trim().max(1500).default(''),
  imageMediaId: z.uuid().nullable().default(null),
  imagePosition: z.enum(['left', 'right']).default('left'),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaHref: linkSchema.optional(),
});

/** Une question tant que sa réponse est vide reste hors du site (brouillon du marchand). */
export const faqItemSchema = z.object({
  id: z.string().trim().min(1).max(40),
  question: z.string().trim().max(160),
  answer: z.string().trim().max(1000).default(''),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('faq'),
  title: z.string().trim().max(120).optional(),
  items: z
    .array(faqItemSchema)
    .max(12)
    .default([])
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
      error: 'Chaque question doit avoir un identifiant unique',
    }),
});

/**
 * Contact de la boutique. Le téléphone (appel et WhatsApp) et l'e-mail viennent des Paramètres :
 * la section dit seulement lesquels montrer, plus une adresse et des horaires en clair.
 */
export const contactSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('contact'),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(300).optional(),
  address: z.string().trim().max(160).optional(),
  hours: z.string().trim().max(160).optional(),
  showPhone: z.boolean().default(true),
  showWhatsapp: z.boolean().default(true),
  showEmail: z.boolean().default(true),
});

export const sectionSchema = z.discriminatedUnion('type', [
  heroSectionSchema,
  featuredCollectionSectionSchema,
  productGridSectionSchema,
  brandStripSectionSchema,
  richTextSectionSchema,
  newsletterSectionSchema,
  imageTextSectionSchema,
  faqSectionSchema,
  contactSectionSchema,
]);
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section['type'];

/** Sections d'une page d'accueil, au plus. */
export const MAX_SECTIONS = 20;

/** Sections qu'une page d'accueil ne porte qu'une fois. */
export const SECTION_LIMITS: Partial<Record<SectionType, number>> = { hero: 1, contact: 1 };

export const themeSettingsBaseSchema = z.object({
  /** Template du site (natif, cahier du tailleur…) ; en brouillon, il change avant d'être publié. */
  template: z.string().trim().min(1).max(40).default('default'),
  /** Palette choisie parmi celles du template ; vide = la première. */
  palette: z.string().trim().max(40).default(''),
  /** Polices choisies par le marchand ; seuls les templates qui le permettent les lisent. */
  fonts: z.object({ heading: fontSchema, body: fontSchema }).default({ heading: 'DM Sans', body: 'Inter' }),
  logoMediaId: z.uuid().nullable().default(null),
  announcement: z.object({
    enabled: z.boolean().default(false),
    text: z.string().trim().max(160).default(''),
  }),
  sections: z
    .array(sectionSchema)
    .max(MAX_SECTIONS)
    .refine((sections) => new Set(sections.map((s) => s.id)).size === sections.length, {
      error: 'Chaque section doit avoir un identifiant unique',
    })
    .refine(
      (sections) =>
        Object.entries(SECTION_LIMITS).every(
          ([type, limit]) => sections.filter((s) => s.type === type).length <= (limit ?? Infinity),
        ),
      { error: 'Une seule bannière d’accueil et une seule section contact par page' },
    ),
});
export type ThemeSettings = z.infer<typeof themeSettingsBaseSchema>;
