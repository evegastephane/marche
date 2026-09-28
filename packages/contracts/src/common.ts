import { z } from 'zod';

// ───────────── Monnaie ─────────────

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'MAD', 'XOF', 'XAF'] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

/** Nombre de décimales de chaque devise : les montants sont stockés en unités mineures. */
export const CURRENCY_EXPONENT: Record<Currency, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  MAD: 2,
  XOF: 0,
  XAF: 0,
};

/** Montant entier en unités mineures (ex. 1990 = 19,90 €, 5000 = 5 000 FCFA). */
export const amountSchema = z
  .number()
  .int({ error: 'Le montant doit être un entier (unités mineures)' })
  .nonnegative({ error: 'Le montant ne peut pas être négatif' })
  .max(Number.MAX_SAFE_INTEGER);

export const moneySchema = z.object({
  amount: amountSchema,
  currency: currencySchema,
});
export type Money = z.infer<typeof moneySchema>;

// ───────────── Localisation ─────────────

export const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, { error: 'Code pays ISO 3166-1 à 2 lettres attendu' });

export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat('fr', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { error: 'Fuseau horaire inconnu' },
);

// ───────────── Identifiants et slugs ─────────────

export const idSchema = z.uuid({ error: 'Identifiant invalide' });

/** Slug d'URL d'une ressource (produit, marque, catalogue) : minuscules, chiffres, tirets. */
export const resourceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: 'Lettres minuscules, chiffres et tirets simples uniquement',
  });

/** Adresse postale (livraison). */
export const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(20).optional(),
  region: z.string().trim().max(100).optional(),
  country: countrySchema,
});
export type Address = z.infer<typeof addressSchema>;

// ───────────── Pagination par curseur ─────────────

export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

// ───────────── Erreurs (RFC 9457) ─────────────

/** Codes métier stables renvoyés par l'API (docs/PLAN-CODE.md §2.4). */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'UNIQUE_VIOLATION',
  'SKU_TAKEN',
  'SLUG_TAKEN',
  'STORE_SLUG_TAKEN',
  'CONCURRENT_MODIFICATION',
  'PRODUCT_NOT_PUBLISHABLE',
  'INSUFFICIENT_STOCK',
  'STOCK_BELOW_RESERVED',
  'INVALID_ORDER_TRANSITION',
  'CART_CHANGED',
  'PRICE_CHANGED',
  'ITEM_UNAVAILABLE',
  'IDEMPOTENCY_IN_PROGRESS',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSED',
  'MEDIA_NOT_UPLOADED',
  'SITE_ALREADY_EXISTS',
  'STORE_REQUIRED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'WHATSAPP_NOT_CONFIGURED',
  'PRODUCT_NOT_ACTIVE',
  'NO_RECIPIENTS',
  'INVALID_PRODUCT_KIND',
  'INVALID_REQUEST_TRANSITION',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
  /** Détail métier propre au code (ex. lignes en rupture pour INSUFFICIENT_STOCK). */
  details: z.unknown().optional(),
});
export type Problem = z.infer<typeof problemSchema>;
