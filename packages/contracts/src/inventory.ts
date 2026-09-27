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
  createdAt: string;
}

export interface InventoryLevelDto {
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number | null;
  updatedAt: string;
}
