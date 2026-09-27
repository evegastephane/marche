import { z } from 'zod';
import { countrySchema, currencySchema, timezoneSchema } from './common.js';

/** Sous-domaines réservés à la plateforme : interdits comme slug de boutique. */
export const RESERVED_STORE_SLUGS = [
  'www',
  'app',
  'api',
  'admin',
  'docs',
  'mail',
  'static',
  'assets',
  's',
] as const;

/**
 * Slug de boutique = sous-domaine du site : 3 à 40 caractères, minuscules,
 * chiffres et tirets, sans tiret en bordure ni double tiret (réservé à l'IDN « xn-- »).
 */
export const storeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, {
    error:
      'De 3 à 40 caractères : lettres minuscules, chiffres et tirets (pas en début ni en fin)',
  })
  .refine((slug) => !slug.includes('--'), {
    error: 'Le double tiret n’est pas autorisé',
  })
  .refine(
    (slug) => !(RESERVED_STORE_SLUGS as readonly string[]).includes(slug),
    { error: 'Cette adresse est réservée' },
  );

export const createStoreSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: storeSlugSchema,
  currency: currencySchema,
  country: countrySchema,
  timezone: timezoneSchema.optional(),
});
export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const updateStoreSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    contactEmail: z.email().nullable(),
    phone: z.string().trim().max(30).nullable(),
    timezone: timezoneSchema,
    logoMediaId: z.uuid().nullable(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    error: 'Aucune modification fournie',
  });
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

export const storeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  currency: currencySchema,
  country: z.string(),
  timezone: z.string(),
  contactEmail: z.string().nullable(),
  phone: z.string().nullable(),
  logoMediaId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});
export type StoreDto = z.infer<typeof storeSchema>;
