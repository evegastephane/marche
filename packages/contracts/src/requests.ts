import { z } from 'zod';
import { amountSchema, type Currency, paginationQuerySchema } from './common.js';

/**
 * Commande sur demande : l'acheteur demande une configuration absente du stock
 * (ou non proposée) ; la boutique répond (prix, délai), puis la transforme en commande.
 */
export const SPECIAL_REQUEST_STATUSES = ['NEW', 'QUOTED', 'DECLINED', 'CONVERTED'] as const;
export type SpecialRequestStatus = (typeof SPECIAL_REQUEST_STATUSES)[number];

export const MAX_REQUEST_QUANTITY = 20;

/** Demande envoyée depuis la fiche produit du site. */
export const specialRequestInputSchema = z.object({
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
});
export type SpecialRequestListQuery = z.infer<typeof specialRequestListQuerySchema>;

export interface SpecialRequestDto {
  id: string;
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
