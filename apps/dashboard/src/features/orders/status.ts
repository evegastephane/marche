import type { OrderStatus, PaymentStatus } from '@marche/contracts';
import type { BadgeTone } from '@/shared/ui/badge';

/** Couleurs d'état des commandes : jaune = à traiter, vert = expédiée, rouge = annulée. */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Brouillon', tone: 'draft' },
  PLACED: { label: 'À expédier', tone: 'sun' },
  FULFILLED: { label: 'Expédiée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

/** Le paiement se lit à part : bleu = payée, contour = pas encore payée. */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  UNPAID: { label: 'Non payée', tone: 'outline' },
  PAID: { label: 'Payée', tone: 'brand' },
  REFUNDED: { label: 'Remboursée', tone: 'outline' },
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
