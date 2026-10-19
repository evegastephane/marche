import { z } from 'zod';
import { amountSchema, paginationQuerySchema } from './common.js';
import { serialSchema } from './inventory.js';
import { customOrderLineInputSchema, MAX_LINE_QUANTITY, MAX_ORDER_LINES, type OrderDto } from './orders.js';

/**
 * Caisse (point de vente) : sessions de caisse, ventes au comptoir payées et remises sur-le-champ,
 * encaissements multiples, mouvements d'espèces, retours et échanges.
 */

// ───────────── Moyens de paiement ─────────────

/** EXCHANGE : avoir né d'un retour, qui paie tout ou partie de la vente de l'échange. */
export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CARD', 'BANK_TRANSFER', 'EXCHANGE', 'OTHER'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const PAYMENT_KINDS = ['PAYMENT', 'REFUND'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
  BANK_TRANSFER: 'Virement',
  EXCHANGE: 'Avoir',
  OTHER: 'Autre',
};

export const DEFAULT_MOBILE_MONEY_PROVIDERS = ['Orange Money', 'Wave', 'MTN MoMo', 'Moov Money'];

// ───────────── Réglages ─────────────

export const RECEIPT_WIDTHS = ['58', '80'] as const;
export type ReceiptWidth = (typeof RECEIPT_WIDTHS)[number];

export const posSettingsSchema = z.object({
  /** Remise maximale qu'un vendeur peut accorder seul, en % du ticket (0 : aucune). */
  staffDiscountMaxPercent: z.number().int().min(0).max(100),
  /** Opérateurs Mobile Money proposés à l'encaissement (vide : Mobile Money désactivé). */
  mobileMoneyProviders: z.array(z.string().trim().min(1).max(40)).max(10),
  acceptCard: z.boolean(),
  acceptBankTransfer: z.boolean(),
  /** Largeur du rouleau de l'imprimante ticket, en millimètres. */
  receiptWidth: z.enum(RECEIPT_WIDTHS),
  /** Mention en pied de ticket (conditions de retour, remerciement). */
  receiptFooter: z.string().trim().max(300),
});
export type PosSettings = z.infer<typeof posSettingsSchema>;

export const DEFAULT_POS_SETTINGS: PosSettings = {
  staffDiscountMaxPercent: 0,
  mobileMoneyProviders: DEFAULT_MOBILE_MONEY_PROVIDERS,
  acceptCard: true,
  acceptBankTransfer: false,
  receiptWidth: '80',
  receiptFooter: 'Merci de votre visite ! Articles repris ou échangés sous 7 jours avec ce ticket.',
};

/** Lecture tolérante des réglages enregistrés : chaque champ illisible reprend sa valeur par défaut. */
export function parsePosSettings(value: unknown): PosSettings {
  const source = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const settings = { ...DEFAULT_POS_SETTINGS };
  for (const key of Object.keys(DEFAULT_POS_SETTINGS) as (keyof PosSettings)[]) {
    const field = posSettingsSchema.shape[key].safeParse(source[key]);
    if (field.success) (settings as Record<string, unknown>)[key] = field.data;
  }
  return settings;
}

export const updatePosSettingsSchema = posSettingsSchema.partial().refine((input) => Object.keys(input).length > 0, {
  error: 'Aucune modification fournie',
});
export type UpdatePosSettingsInput = z.infer<typeof updatePosSettingsSchema>;

/** Moyens de paiement proposés à l'encaissement, selon les réglages (l'avoir n'apparaît que lors d'un échange). */
export function enabledPaymentMethods(settings: PosSettings): PaymentMethod[] {
  return [
    'CASH',
    ...(settings.mobileMoneyProviders.length > 0 ? (['MOBILE_MONEY'] as const) : []),
    ...(settings.acceptCard ? (['CARD'] as const) : []),
    ...(settings.acceptBankTransfer ? (['BANK_TRANSFER'] as const) : []),
    'OTHER',
  ];
}

// ───────────── Sessions de caisse ─────────────

export const POS_SESSION_STATUSES = ['OPEN', 'CLOSED'] as const;
export type PosSessionStatus = (typeof POS_SESSION_STATUSES)[number];

export const CASH_MOVEMENT_TYPES = ['IN', 'OUT'] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

const positiveAmountSchema = amountSchema.refine((value) => value > 0, { error: 'Le montant doit être supérieur à zéro' });

export const openPosSessionSchema = z.object({
  /** Fond de caisse : espèces présentes dans le tiroir à l'ouverture. */
  openingFloat: amountSchema,
  label: z.string().trim().min(1).max(40).optional(),
});
export type OpenPosSessionInput = z.infer<typeof openPosSessionSchema>;

export const closePosSessionSchema = z.object({
  /** Espèces comptées dans le tiroir à la fermeture. */
  countedCash: amountSchema,
  note: z.string().trim().max(500).optional(),
  version: z.number().int().min(0),
});
export type ClosePosSessionInput = z.infer<typeof closePosSessionSchema>;

export const cashMovementSchema = z.object({
  type: z.enum(CASH_MOVEMENT_TYPES),
  amount: positiveAmountSchema,
  reason: z.string().trim().min(1).max(200),
});
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

export const posSessionListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(POS_SESSION_STATUSES).optional(),
});
export type PosSessionListQuery = z.infer<typeof posSessionListQuerySchema>;

// ───────────── Vente ─────────────

export const posPaymentInputSchema = z
  .object({
    method: paymentMethodSchema,
    /** Montant versé. En espèces : la somme remise par le client (la monnaie rendue en découle). */
    amount: positiveAmountSchema,
    provider: z.string().trim().min(1).max(40).optional(),
    reference: z.string().trim().min(1).max(80).optional(),
    /** Avoir utilisé (EXCHANGE) : le retour qui l'a créé. */
    returnId: z.uuid().optional(),
  })
  .superRefine((payment, ctx) => {
    if (payment.method === 'EXCHANGE' && !payment.returnId) {
      ctx.addIssue({ code: 'custom', path: ['returnId'], message: 'Indiquez le retour dont l’avoir est utilisé' });
    }
    if (payment.method === 'MOBILE_MONEY' && !payment.provider) {
      ctx.addIssue({ code: 'custom', path: ['provider'], message: 'Choisissez l’opérateur Mobile Money' });
    }
  });
export type PosPaymentInput = z.infer<typeof posPaymentInputSchema>;

export const posSaleLineSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  /** IMEI ou numéros de série des appareils remis (articles suivis à l'unité) : un par exemplaire. */
  serials: z.array(serialSchema).max(MAX_LINE_QUANTITY).default([]),
});
export type PosSaleLineInput = z.infer<typeof posSaleLineSchema>;

export const POS_DISCOUNT_KINDS = ['AMOUNT', 'PERCENT'] as const;
export const posDiscountSchema = z
  .object({
    kind: z.enum(POS_DISCOUNT_KINDS),
    /** Montant en unités mineures, ou pourcentage entier. */
    value: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((discount) => discount.kind !== 'PERCENT' || discount.value <= 100, {
    error: 'Une remise ne dépasse pas 100 %',
    path: ['value'],
  });
export type PosDiscountInput = z.infer<typeof posDiscountSchema>;

export const posCustomerSchema = z
  .object({
    phone: z.string().trim().min(6).max(30).optional(),
    email: z
      .email()
      .transform((email) => email.toLowerCase())
      .optional(),
    firstName: z.string().trim().max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    /** Accord du client pour recevoir les nouveautés sur WhatsApp. */
    whatsappOptIn: z.boolean().optional(),
  })
  .refine((customer) => Boolean(customer.phone || customer.email), {
    error: 'Un téléphone ou un e-mail est nécessaire pour enregistrer le client',
    path: ['phone'],
  });
export type PosCustomerInput = z.infer<typeof posCustomerSchema>;

export const posSaleSchema = z
  .object({
    sessionId: z.uuid(),
    lines: z
      .array(posSaleLineSchema)
      .max(MAX_ORDER_LINES)
      .refine((lines) => new Set(lines.map((line) => line.variantId)).size === lines.length, {
        error: 'Un article ne peut apparaître qu’une fois dans le ticket',
      })
      .default([]),
    /** Article divers hors catalogue, au prix saisi (sans stock). */
    customLines: z.array(customOrderLineInputSchema).max(MAX_ORDER_LINES).default([]),
    discount: posDiscountSchema.optional(),
    customer: posCustomerSchema.optional(),
    payments: z.array(posPaymentInputSchema).max(5).default([]),
    note: z.string().trim().max(500).optional(),
  })
  .refine((sale) => sale.lines.length + sale.customLines.length > 0, {
    error: 'Le ticket ne contient aucun article',
    path: ['lines'],
  });
export type PosSaleInput = z.infer<typeof posSaleSchema>;

/** Devis du ticket avant encaissement : les prix et remises que le serveur appliquera. */
export const posQuoteSchema = z
  .object({
    lines: z
      .array(posSaleLineSchema.pick({ variantId: true, quantity: true }))
      .max(MAX_ORDER_LINES)
      .default([]),
    customLines: z.array(customOrderLineInputSchema).max(MAX_ORDER_LINES).default([]),
    discount: posDiscountSchema.optional(),
  })
  .refine((quote) => quote.lines.length + quote.customLines.length > 0, {
    error: 'Le ticket ne contient aucun article',
    path: ['lines'],
  });
export type PosQuoteInput = z.infer<typeof posQuoteSchema>;

export interface PosQuoteDto {
  subtotalAmount: number;
  /** Remises des packs et remise de caisse. */
  discounts: { bundleId: string | null; title: string; amount: number }[];
  discountAmount: number;
  totalAmount: number;
}

/** Montant de la remise de caisse, plafonné à ce qui reste à payer (jamais négatif). */
export function posDiscountAmount(baseAmount: number, discount: Pick<PosDiscountInput, 'kind' | 'value'> | undefined): number {
  if (!discount || baseAmount <= 0) return 0;
  const raw = discount.kind === 'PERCENT' ? Math.round((baseAmount * discount.value) / 100) : discount.value;
  return Math.min(Math.max(raw, 0), baseAmount);
}

/** Paiement retenu sur une vente : montant gardé, et espèces remises pour un paiement en espèces. */
export interface AllocatedPayment {
  method: PaymentMethod;
  amount: number;
  tenderedAmount: number | null;
  provider?: string;
  reference?: string;
  returnId?: string;
}

export type PaymentAllocation =
  | { ok: true; payments: AllocatedPayment[]; changeAmount: number; paidAmount: number }
  | { ok: false; reason: 'NON_CASH_EXCEEDS' | 'INSUFFICIENT'; missingAmount: number; changeAmount: 0; paidAmount: number };

/**
 * Règle de l'encaissement, partagée par la caisse (aperçu) et l'API (décision) : seuls les espèces
 * rendent la monnaie. Les autres moyens ne dépassent jamais le total ; les espèces couvrent le reste,
 * et la monnaie rendue est retirée du dernier versement en espèces.
 */
export function allocatePayments(totalAmount: number, payments: readonly PosPaymentInput[]): PaymentAllocation {
  const nonCash = payments.filter((payment) => payment.method !== 'CASH').reduce((sum, payment) => sum + payment.amount, 0);
  const cash = payments.filter((payment) => payment.method === 'CASH').reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = nonCash + cash;
  if (nonCash > totalAmount) return { ok: false, reason: 'NON_CASH_EXCEEDS', missingAmount: 0, changeAmount: 0, paidAmount };
  if (paidAmount < totalAmount) {
    return { ok: false, reason: 'INSUFFICIENT', missingAmount: totalAmount - paidAmount, changeAmount: 0, paidAmount };
  }
  let change = paidAmount - totalAmount;
  const changeAmount = change;
  const allocated: AllocatedPayment[] = [];
  for (let index = payments.length - 1; index >= 0; index -= 1) {
    const payment = payments[index]!;
    const base = {
      method: payment.method,
      ...(payment.provider ? { provider: payment.provider } : {}),
      ...(payment.reference ? { reference: payment.reference } : {}),
      ...(payment.returnId ? { returnId: payment.returnId } : {}),
    };
    if (payment.method !== 'CASH') {
      allocated.unshift({ ...base, amount: payment.amount, tenderedAmount: null });
      continue;
    }
    const given = Math.min(change, payment.amount);
    change -= given;
    const kept = payment.amount - given;
    // Un versement entièrement rendu en monnaie n'est pas un encaissement.
    if (kept > 0) allocated.unshift({ ...base, amount: kept, tenderedAmount: payment.amount });
  }
  return { ok: true, payments: allocated, changeAmount, paidAmount };
}

// ───────────── Retours et échanges ─────────────

export const posReturnSchema = z.object({
  sessionId: z.uuid(),
  lines: z
    .array(
      z.object({
        orderLineId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
        /** Appareils rapportés (articles suivis à l'unité) : un IMEI par exemplaire. */
        serials: z.array(serialSchema).max(MAX_LINE_QUANTITY).default([]),
      }),
    )
    .min(1)
    .max(MAX_ORDER_LINES)
    .refine((lines) => new Set(lines.map((line) => line.orderLineId)).size === lines.length, {
      error: 'Une ligne ne peut apparaître qu’une fois dans le retour',
    }),
  /** Les articles repartent en rayon (sinon : défectueux, sortis du stock). */
  restock: z.boolean().default(true),
  refund: z.object({
    method: paymentMethodSchema,
    provider: z.string().trim().min(1).max(40).optional(),
    reference: z.string().trim().min(1).max(80).optional(),
  }),
  reason: z.string().trim().min(1).max(300),
});
export type PosReturnInput = z.infer<typeof posReturnSchema>;

// ───────────── Recherche et lecture au scanner ─────────────

export const posVariantSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});
export type PosVariantSearchQuery = z.infer<typeof posVariantSearchQuerySchema>;

export const posLookupQuerySchema = z.object({
  /** Code-barres, SKU ou IMEI lu par la douchette ou saisi. */
  code: z.string().trim().min(1).max(64),
});
export type PosLookupQuery = z.infer<typeof posLookupQuerySchema>;

export const posSaleListQuerySchema = paginationQuerySchema.extend({
  sessionId: z.uuid().optional(),
  /** Numéro de ticket (commande), pour retrouver une vente à reprendre. */
  number: z.coerce.number().int().min(1).optional(),
});
export type PosSaleListQuery = z.infer<typeof posSaleListQuerySchema>;

// ───────────── DTO ─────────────

export interface OrderPaymentDto {
  id: string;
  kind: PaymentKind;
  method: PaymentMethod;
  amount: number;
  tenderedAmount: number | null;
  /** Monnaie rendue sur ce versement en espèces. */
  changeAmount: number;
  provider: string | null;
  reference: string | null;
  returnId: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface OrderReturnLineDto {
  orderLineId: string;
  quantity: number;
  amount: number;
  serials: string[];
}

export interface OrderReturnDto {
  id: string;
  reason: string;
  restocked: boolean;
  refundAmount: number;
  refundMethod: PaymentMethod;
  /** Avoir encore disponible (retour remboursé en avoir pour un échange). */
  creditRemaining: number;
  sessionId: string | null;
  createdAt: string;
  lines: OrderReturnLineDto[];
}

export interface PosVariantDto {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  barcode: string | null;
  priceAmount: number;
  /** Stock disponible ; null si l'article ne suit pas de stock. */
  available: number | null;
  tracksUnits: boolean;
  imageUrl: string | null;
  /** Un produit en brouillon se vend en boutique, mais pas sur le site. */
  productActive: boolean;
}

export interface PosLookupDto {
  variant: PosVariantDto;
  /** IMEI lu : l'appareil exact, en stock. */
  serial: string | null;
}

export interface PosSessionMethodTotalDto {
  method: PaymentMethod;
  provider: string | null;
  payments: number;
  refunds: number;
}

export interface PosSessionTotalsDto {
  salesCount: number;
  itemsCount: number;
  /** Total des tickets (remises déduites). */
  salesAmount: number;
  discountAmount: number;
  refundAmount: number;
  /** Ventes moins remboursements. */
  netAmount: number;
  cashPayments: number;
  cashRefunds: number;
  movementsIn: number;
  movementsOut: number;
  /** Espèces attendues dans le tiroir : fond + espèces encaissées − rendues + entrées − sorties. */
  expectedCash: number;
  byMethod: PosSessionMethodTotalDto[];
}

export interface PosPersonDto {
  id: string;
  name: string;
}

export interface PosSessionDto {
  id: string;
  label: string | null;
  status: PosSessionStatus;
  openedBy: PosPersonDto;
  openedAt: string;
  openingFloat: number;
  closedBy: PosPersonDto | null;
  closedAt: string | null;
  countedCash: number | null;
  /** Écart de caisse à la fermeture : compté − attendu. */
  difference: number | null;
  closingNote: string | null;
  totals: PosSessionTotalsDto;
  version: number;
}

export interface CashMovementDto {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface PosSaleSummaryDto {
  orderId: string;
  number: number | null;
  totalAmount: number;
  refundedAmount: number;
  itemsCount: number;
  customerName: string | null;
  methods: PaymentMethod[];
  placedAt: string | null;
}

export interface PosSessionDetailDto extends PosSessionDto {
  movements: CashMovementDto[];
  sales: PosSaleSummaryDto[];
  returns: (OrderReturnDto & { orderId: string; orderNumber: number | null })[];
}

/** Vente encaissée, prête pour le ticket. */
export interface PosSaleDto {
  order: OrderDto;
  changeAmount: number;
  sessionLabel: string | null;
  sellerName: string | null;
}

export interface PosReturnResultDto {
  order: OrderDto;
  orderReturn: OrderReturnDto;
}

/** Avoir disponible pour un échange. */
export interface PosCreditDto {
  returnId: string;
  orderId: string;
  orderNumber: number | null;
  creditRemaining: number;
}
