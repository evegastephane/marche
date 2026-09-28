import type { OrderStatus, PaymentStatus } from '@marche/contracts';
import type { BadgeTone } from '@/shared/ui/badge';

/**
 * États des commandes en témoins : orange = à expédier (il y a quelque chose à faire),
 * plein = expédiée, pointillé = brouillon, rouge = annulée.
 */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Brouillon', tone: 'draft' },
  PLACED: { label: 'À expédier', tone: 'attention' },
  FULFILLED: { label: 'Expédiée', tone: 'on' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

/** Le paiement se lit à part : plein = payée, creux = pas encore payée. */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  UNPAID: { label: 'Non payée', tone: 'off' },
  PAID: { label: 'Payée', tone: 'on' },
  REFUNDED: { label: 'Remboursée', tone: 'off' },
};

export type OrderFilter = 'all' | 'to-ship' | 'unpaid' | 'fulfilled' | 'cancelled' | 'draft';

export const ORDER_FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'to-ship', label: 'À expédier' },
  { value: 'unpaid', label: 'Non payées' },
  { value: 'fulfilled', label: 'Expédiées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'draft', label: 'Brouillons' },
];

export function filterToQuery(filter: OrderFilter): {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
} {
  switch (filter) {
    case 'to-ship':
      return { status: 'PLACED' };
    case 'unpaid':
      return { paymentStatus: 'UNPAID', status: 'PLACED' };
    case 'fulfilled':
      return { status: 'FULFILLED' };
    case 'cancelled':
      return { status: 'CANCELLED' };
    case 'draft':
      return { status: 'DRAFT' };
    default:
      return {};
  }
}
