import { z } from 'zod';
import { type Address, addressSchema, amountSchema, type Currency, paginationQuerySchema } from './common.js';

export const ORDER_STATUSES = ['DRAFT', 'PLACED', 'FULFILLED', 'CANCELLED'] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED'] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const ORDER_SOURCES = ['ADMIN', 'STOREFRONT'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const MAX_ORDER_LINES = 100;
export const MAX_LINE_QUANTITY = 999;

export const orderLineInputSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});
export type OrderLineInput = z.infer<typeof orderLineInputSchema>;

/**
 * Ligne libre (commande sur demande) : un article hors catalogue ou hors stock,
 * au prix convenu avec le client. Elle ne réserve pas de stock.
 */
export const customOrderLineInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  variantTitle: z.string().trim().max(200).default(''),
  unitPriceAmount: amountSchema,
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});
export type CustomOrderLineInput = z.infer<typeof customOrderLineInputSchema>;

export const customerInputSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

const linesSchema = z
  .array(orderLineInputSchema)
  .max(MAX_ORDER_LINES)
  .refine((lines) => new Set(lines.map((l) => l.variantId)).size === lines.length, {
    error: 'Une variante ne peut apparaître qu’une fois dans la commande',
  });

export const createDraftOrderSchema = z.object({
  customer: customerInputSchema.nullable().optional(),
  lines: linesSchema.default([]),
  customLines: z.array(customOrderLineInputSchema).max(MAX_ORDER_LINES).default([]),
  shippingAddress: addressSchema.nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});
export type CreateDraftOrderInput = z.infer<typeof createDraftOrderSchema>;

export const updateDraftOrderSchema = z.object({
  customer: customerInputSchema.nullable().optional(),
  lines: linesSchema.optional(),
  customLines: z.array(customOrderLineInputSchema).max(MAX_ORDER_LINES).optional(),
  shippingAddress: addressSchema.nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  version: z.number().int().min(0),
});
export type UpdateDraftOrderInput = z.infer<typeof updateDraftOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  customerId: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const customerListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export interface OrderLineDto {
  id: string;
  variantId: string | null;
  productTitle: string;
  variantTitle: string;
  sku: string;
  unitPriceAmount: number;
  quantity: number;
  lineTotalAmount: number;
  tracksInventory: boolean;
  /** Ligne libre (commande sur demande) : hors catalogue, sans réservation de stock. */
  custom: boolean;
}

/** Remise d'un pack appliquée à une commande (ou à un panier). */
export interface OrderDiscount {
  bundleId: string | null;
  title: string;
  amount: number;
}

export interface OrderCustomerDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface OrderDto {
  id: string;
  number: number | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: OrderSource;
  currency: Currency;
  email: string | null;
  customer: OrderCustomerDto | null;
  lines: OrderLineDto[];
  subtotalAmount: number;
  /** Remises des packs, figées au passage de la commande. */
  discounts: OrderDiscount[];
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddress: Address | null;
  shippingMethod: string | null;
  note: string | null;
  cancelReason: string | null;
  publicToken: string;
  placedAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OrderListItemDto {
  id: string;
  number: number | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: OrderSource;
  email: string | null;
  customerName: string | null;
  itemsCount: number;
  totalAmount: number;
  currency: Currency;
  createdAt: string;
  placedAt: string | null;
}

export interface CustomerDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  defaultAddress: Address | null;
  ordersCount: number;
  totalSpentAmount: number;
  lastOrderAt: string | null;
  /** Consentement aux nouveautés par WhatsApp, et désinscription éventuelle (« STOP »). */
  whatsappOptInAt: string | null;
  whatsappOptOutAt: string | null;
  createdAt: string;
}

export interface CustomerDetailDto extends CustomerDto {
  orders: OrderListItemDto[];
}

/** Détail des lignes en rupture lors d'une réservation (code INSUFFICIENT_STOCK). */
export interface InsufficientStockDetail {
  variantId: string;
  requested: number;
  available: number;
}
