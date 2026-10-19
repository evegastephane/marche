import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';
import type { OrderData, OrderLineData } from './order.aggregate.js';

export class ReturnNotAllowedError extends ConflictError {
  constructor(message: string) {
    super('RETURN_NOT_ALLOWED', message);
  }
}

export class ReturnExceedsSaleError extends ValidationError {
  constructor(productTitle: string, remaining: number) {
    super(
      'RETURN_EXCEEDS_SALE',
      remaining === 0
        ? `« ${productTitle} » a déjà été entièrement rapporté`
        : `« ${productTitle} » : ${remaining} exemplaire${remaining > 1 ? 's' : ''} au plus peu${remaining > 1 ? 'vent' : 't'} encore être rapporté${remaining > 1 ? 's' : ''}`,
      { remaining },
    );
  }
}

export class SerialsRequiredError extends ValidationError {
  constructor(productTitle: string, expected: number) {
    super(
      'SERIALS_REQUIRED',
      expected === 1
        ? `« ${productTitle} » : indiquez l’IMEI de l’appareil rapporté`
        : `« ${productTitle} » : indiquez les ${expected} IMEI des appareils rapportés`,
    );
  }
}

/** Ce qui a déjà été rapporté sur chaque ligne (retours précédents). */
export type ReturnedSoFar = ReadonlyMap<string, { quantity: number; serials: ReadonlySet<string> }>;

export interface ReturnRequestLine {
  orderLineId: string;
  quantity: number;
  serials: readonly string[];
}

export interface PlannedReturnLine {
  line: OrderLineData;
  quantity: number;
  serials: string[];
  /** Part remboursée de la ligne, remise de la commande déduite au prorata. */
  amount: number;
}

export interface PlannedReturn {
  lines: PlannedReturnLine[];
  refundAmount: number;
}

/**
 * Règles d'un retour d'articles (caisse) : commande remise au client et payée, quantités dans la limite
 * de ce qui reste à rapporter, IMEI des appareils vendus. Le remboursement suit le prix payé : la remise
 * de la commande est répartie au prorata des lignes ; le dernier retour solde exactement la commande.
 */
export function planReturn(order: Readonly<OrderData>, request: readonly ReturnRequestLine[], returned: ReturnedSoFar): PlannedReturn {
  if (order.status !== 'FULFILLED') {
    throw new ReturnNotAllowedError('Seule une commande remise au client peut faire l’objet d’un retour');
  }
  if (order.paymentStatus === 'UNPAID') throw new ReturnNotAllowedError('Cette commande n’a pas été payée : rien à rembourser');
  if (order.refundedAmount >= order.totalAmount && order.totalAmount > 0) {
    throw new ReturnNotAllowedError('Cette commande a déjà été entièrement remboursée');
  }

  const netRatio = order.subtotalAmount > 0 ? (order.subtotalAmount - order.discountAmount) / order.subtotalAmount : 0;
  const lines: PlannedReturnLine[] = request.map((entry) => {
    const line = order.lines.find((candidate) => candidate.id === entry.orderLineId);
    if (!line) throw new ValidationError('VALIDATION_FAILED', 'Ligne de commande inconnue', { orderLineId: entry.orderLineId });
    const before = returned.get(line.id);
    const remaining = line.quantity - (before?.quantity ?? 0);
    if (entry.quantity > remaining) throw new ReturnExceedsSaleError(line.productTitle, remaining);

    const sold = line.serialNumbers ?? [];
    const serials = [...new Set(entry.serials.map((serial) => serial.trim()).filter(Boolean))];
    if (sold.length > 0) {
      if (serials.length !== entry.quantity) throw new SerialsRequiredError(line.productTitle, entry.quantity);
      for (const serial of serials) {
        if (!sold.includes(serial)) {
          throw new ValidationError('VALIDATION_FAILED', `L’appareil ${serial} n’a pas été vendu sur cette commande`, { serial });
        }
        if (before?.serials.has(serial)) {
          throw new ValidationError('VALIDATION_FAILED', `L’appareil ${serial} a déjà été rapporté`, { serial });
        }
      }
    } else if (serials.length > 0) {
      throw new ValidationError('VALIDATION_FAILED', `« ${line.productTitle} » n’est pas suivi à l’IMEI`);
    }
    return { line, quantity: entry.quantity, serials, amount: Math.round(line.unitPriceAmount * entry.quantity * netRatio) };
  });

  const left = order.totalAmount - order.refundedAmount;
  const completes = order.lines.every((line) => {
    const before = returned.get(line.id)?.quantity ?? 0;
    const now = lines.find((planned) => planned.line.id === line.id)?.quantity ?? 0;
    return before + now >= line.quantity;
  });
  const computed = lines.reduce((sum, planned) => sum + planned.amount, 0);
  // Arrondis : le dernier retour rembourse exactement ce qui reste ; jamais plus que ce qui a été payé.
  const refundAmount = completes ? left : Math.min(computed, left);
  return { lines, refundAmount: Math.max(refundAmount, 0) };
}
