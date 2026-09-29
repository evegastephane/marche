import { z } from 'zod';
import { amountSchema, type Currency, paginationQuerySchema } from './common.js';

/**
 * Commande sur demande : l'acheteur demande une configuration absente du stock
 * (ou non proposée) ; la boutique répond (prix, délai), puis la transforme en commande.
 */
export const SPECIAL_REQUEST_STATUSES = ['NEW', 'QUOTED', 'DECLINED', 'CONVERTED'] as const;
export type SpecialRequestStatus = (typeof SPECIAL_REQUEST_STATUSES)[number];

/**
 * Nature de la demande : une configuration absente du stock, un achat avec reprise de l'ancien
 * appareil (Tech), ou une pièce sur mesure avec les mesures du client (Mode).
 */
export const SPECIAL_REQUEST_TYPES = ['CONFIGURATION', 'TRADE_IN', 'MADE_TO_MEASURE'] as const;
export const specialRequestTypeSchema = z.enum(SPECIAL_REQUEST_TYPES);
export type SpecialRequestType = (typeof SPECIAL_REQUEST_TYPES)[number];

export const SPECIAL_REQUEST_TYPE_LABELS: Record<SpecialRequestType, string> = {
  CONFIGURATION: 'Sur commande',
  TRADE_IN: 'Reprise',
  MADE_TO_MEASURE: 'Sur mesure',
};

/** Précision nommée : une mesure (« Tour de taille : 82 cm ») ou une information sur l'appareil repris. */
const detailSchema = z.object({ name: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(80) });

export const MAX_REQUEST_QUANTITY = 20;

/** Demande envoyée depuis la fiche produit du site. */
export const specialRequestInputSchema = z.object({
  type: specialRequestTypeSchema.default('CONFIGURATION'),
  productSlug: z.string().trim().min(1).max(100),
  /** Configuration souhaitée (valeurs choisies, même si la combinaison n'existe pas). */
  options: z
    .array(z.object({ name: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(40) }))
    .max(4)
    .default([]),
  quantity: z.number().int().min(1).max(MAX_REQUEST_QUANTITY).default(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.email().transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(6).max(30),
  /** Précisions libres : « 1 To, couleur verte », délai souhaité… */
  note: z.string().trim().max(500).optional(),
  /** Mesures du client (sur mesure) ou appareil à reprendre : modèle, stockage, état (reprise). */
  details: z.array(detailSchema).max(12).default([]),
});
export type SpecialRequestInput = z.infer<typeof specialRequestInputSchema>;

export const quoteSpecialRequestSchema = z.object({
  /** Prix unitaire convenu, en unités mineures. */
  unitPriceAmount: amountSchema,
  /** Délai annoncé au client : « 5 jours », « sous 2 semaines »… */
  delay: z.string().trim().min(1).max(80),
});
export type QuoteSpecialRequestInput = z.infer<typeof quoteSpecialRequestSchema>;

export const declineSpecialRequestSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});
export type DeclineSpecialRequestInput = z.infer<typeof declineSpecialRequestSchema>;

export const specialRequestListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(SPECIAL_REQUEST_STATUSES).optional(),
  type: specialRequestTypeSchema.optional(),
});
export type SpecialRequestListQuery = z.infer<typeof specialRequestListQuerySchema>;

export interface SpecialRequestDto {
  id: string;
  type: SpecialRequestType;
  status: SpecialRequestStatus;
  productId: string | null;
  productTitle: string;
  productSlug: string | null;
  options: { name: string; value: string }[];
  quantity: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
  note: string | null;
  details: { name: string; value: string }[];
  currency: Currency;
  quotedUnitPriceAmount: number | null;
  quotedDelay: string | null;
  declineReason: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Accusé de réception affiché à l'acheteur. */
export interface SpecialRequestReceiptDto {
  id: string;
  productTitle: string;
}
