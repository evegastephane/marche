import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const STOCK_MOVEMENT_TYPES = [
  'INITIAL',
  'RECEIPT',
  'ADJUSTMENT',
  'LOSS',
  'SALE',
  'RETURN',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** Types de mouvement saisissables par le marchand. */
export const ADJUSTABLE_MOVEMENT_TYPES = ['RECEIPT', 'ADJUSTMENT', 'LOSS', 'RETURN'] as const;
export type AdjustableMovementType = (typeof ADJUSTABLE_MOVEMENT_TYPES)[number];

export const adjustStockSchema = z
  .object({
    type: z.enum(ADJUSTABLE_MOVEMENT_TYPES),
    /** Réception, perte, retour : quantité positive. Ajustement : quantité signée non nulle. */
    quantity: z.number().int().min(-1_000_000).max(1_000_000),
    reason: z.string().trim().max(200).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.quantity === 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'La quantité ne peut pas être nulle' });
    }
    if (input.type !== 'ADJUSTMENT' && input.quantity < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'La quantité doit être positive pour ce type de mouvement',
      });
    }
    if ((input.type === 'LOSS' || input.type === 'ADJUSTMENT') && !input.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Le motif est obligatoire' });
    }
  });
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

/**
 * Comptage (grille taille × couleur) : le stock en main compté pour chaque déclinaison.
 * Le serveur calcule l'écart et l'enregistre comme un ajustement « Comptage ». Tout passe, ou rien.
 */
export const stockCountSchema = z.object({
  entries: z
    .array(
      z.object({
        variantId: z.uuid(),
        onHand: z.number().int().min(0).max(1_000_000),
        /** Stock affiché au moment du comptage : si quelqu'un l'a changé entre-temps, le comptage est refusé. */
        expectedOnHand: z.number().int().min(0).max(1_000_000).optional(),
      }),
    )
    .min(1)
    .max(100)
    .refine((entries) => new Set(entries.map((e) => e.variantId)).size === entries.length, {
      error: 'Une déclinaison ne peut être comptée qu’une fois',
    }),
  reason: z.string().trim().min(1).max(200).default('Comptage'),
});
export type StockCountInput = z.infer<typeof stockCountSchema>;

export const setLowStockThresholdSchema = z.object({
  /** null = utiliser le seuil par défaut de la boutique. */
  lowStockThreshold: z.number().int().min(0).max(1_000_000).nullable(),
});
export type SetLowStockThresholdInput = z.infer<typeof setLowStockThresholdSchema>;

export const inventoryListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  filter: z.enum(['all', 'low', 'out']).default('all'),
});
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

// ───────────── Unités suivies (IMEI, numéros de série) ─────────────

export const UNIT_CONDITIONS = ['NEW', 'USED'] as const;
export type UnitCondition = (typeof UNIT_CONDITIONS)[number];

export const STOCK_UNIT_STATUSES = ['IN_STOCK', 'SOLD', 'REMOVED'] as const;
export type StockUnitStatus = (typeof STOCK_UNIT_STATUSES)[number];

/** IMEI ou numéro de série : espaces et points retirés, majuscules. */
export const serialSchema = z
  .string()
  .transform((value) => value.replace(/[\s.]+/g, '').toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9-]{3,40}$/, { error: 'IMEI ou numéro de série : 3 à 40 chiffres ou lettres' }));

/** Un IMEI à 15 chiffres dont la clé de Luhn est fausse : sûrement une faute de frappe. */
export function looksLikeBadImei(serial: string): boolean {
  if (!/^\d{15}$/.test(serial)) return false;
  const sum = [...serial].reverse().reduce((total, char, index) => {
    const n = Number(char) * (index % 2 === 1 ? 2 : 1);
    return total + (n > 9 ? n - 9 : n);
  }, 0);
  return sum % 10 !== 0;
}

export const unitInputSchema = z.object({
  serial: serialSchema,
  batteryHealth: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(200).nullable().optional(),
});
export type UnitInput = z.infer<typeof unitInputSchema>;

/** Réception d'unités : chacune devient un mouvement +1 lié à son IMEI. */
export const receiveUnitsSchema = z.object({
  units: z
    .array(unitInputSchema)
    .min(1)
    .max(200)
    .refine((units) => new Set(units.map((unit) => unit.serial)).size === units.length, {
      error: 'Un IMEI ne figure qu’une fois',
    }),
  condition: z.enum(UNIT_CONDITIONS).default('NEW'),
  reason: z.string().trim().max(200).optional(),
});
export type ReceiveUnitsInput = z.infer<typeof receiveUnitsSchema>;

export const updateUnitSchema = z
  .object({
    serial: serialSchema,
    batteryHealth: z.number().int().min(0).max(100).nullable(),
    notes: z.string().trim().max(200).nullable(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, { error: 'Aucune modification fournie' });
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

/** Sortie (perte, vol, défaut) ou retour d'une unité : le motif est gardé dans le journal. */
export const unitMovementSchema = z.object({ reason: z.string().trim().min(1).max(200) });
export type UnitMovementInput = z.infer<typeof unitMovementSchema>;

export const unitListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(STOCK_UNIT_STATUSES).optional(),
});
export type UnitListQuery = z.infer<typeof unitListQuerySchema>;

export interface StockUnitDto {
  id: string;
  variantId: string;
  serial: string;
  /** Unité reprise sans IMEI : numéro provisoire à remplacer. */
  placeholder: boolean;
  condition: UnitCondition;
  batteryHealth: number | null;
  status: StockUnitStatus;
  notes: string | null;
  orderLineId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  thumbnailUrl: string | null;
  onHand: number;
  reserved: number;
  available: number;
  /** Seuil effectif (celui de la variante ou, à défaut, celui de la boutique). */
  lowStockThreshold: number;
  hasCustomThreshold: boolean;
  isLow: boolean;
  isOut: boolean;
  /** Suivi à l'unité : le stock bouge par l'entrée ou la sortie d'IMEI, pas par ajustement. */
  tracksUnits: boolean;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  type: StockMovementType;
  quantity: number;
  onHandAfter: number;
  reason: string | null;
  orderId: string | null;
  actorUserId: string | null;
  /** IMEI ou numéro de série de l'unité entrée ou sortie. */
  serial: string | null;
  createdAt: string;
}

export interface InventoryLevelDto {
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number | null;
  tracksUnits: boolean;
  updatedAt: string;
}
