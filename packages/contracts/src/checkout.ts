import { z } from 'zod';
import { addressSchema, type Currency } from './common.js';
import type { OrderStatus, PaymentStatus } from './orders.js';

export const MAX_CART_LINES = 50;
export const MAX_CART_LINE_QUANTITY = 99;

export const addCartLineSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_CART_LINE_QUANTITY),
});
export type AddCartLineInput = z.infer<typeof addCartLineSchema>;

export const updateCartLineSchema = z.object({
  /** 0 retire la ligne. */
  quantity: z.number().int().min(0).max(MAX_CART_LINE_QUANTITY),
});
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>;

export const checkoutSchema = z.object({
  cartId: z.uuid(),
  email: z.email().transform((email) => email.toLowerCase()),
  phone: z.string().trim().max(30).optional(),
  shippingAddress: addressSchema,
  note: z.string().trim().max(500).optional(),
  /** Case « Recevoir les nouveautés sur WhatsApp » : consentement explicite, jamais coché d'avance. */
  whatsappOptIn: z.boolean().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export interface CartLineDto {
  variantId: string;
  productId: string | null;
  productSlug: string | null;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  unitPriceAmount: number;
  quantity: number;
  lineTotalAmount: number;
  /** null : stock non suivi (toujours disponible). */
  available: number | null;
  isSellable: boolean;
}

export interface CartDto {
  id: string;
  currency: Currency;
  lines: CartLineDto[];
  itemsCount: number;
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  updatedAt: string;
}

export type CartChangeReason = 'PRICE_CHANGED' | 'ITEM_UNAVAILABLE' | 'INSUFFICIENT_STOCK';

/** Détail renvoyé avec le code CART_CHANGED : le panier a été mis à jour, l'acheteur doit revalider. */
export interface CartChangeDto {
  variantId: string;
  reason: CartChangeReason;
  previousPriceAmount?: number;
  currentPriceAmount?: number;
  available?: number;
}

export interface CheckoutResultDto {
  orderNumber: number;
  publicToken: string;
  totalAmount: number;
  currency: Currency;
}

/** Confirmation visible par l'acheteur (données minimales). */
export interface PublicOrderDto {
  number: number | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: Currency;
  lines: {
    productTitle: string;
    variantTitle: string;
    quantity: number;
    unitPriceAmount: number;
    lineTotalAmount: number;
  }[];
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  placedAt: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
}
