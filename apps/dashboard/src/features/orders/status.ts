import type { OrderStatus, PaymentStatus } from '@marche/contracts';
import type { PlaqueTone } from '@/shared/ui/plaque';

/** Peintures d'état des commandes : jaune = à traiter, vert = expédiée, rouge = annulée. */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: PlaqueTone }> = {
  DRAFT: { label: 'Brouillon', tone: 'pointille' },
  PLACED: { label: 'À expédier', tone: 'jaune' },
  FULFILLED: { label: 'Expédiée', tone: 'vert' },
  CANCELLED: { label: 'Annulée', tone: 'rouge' },
};

/** Le paiement se lit à part : bleu = payée, contour = pas encore payée. */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: PlaqueTone }> = {
  UNPAID: { label: 'Non payée', tone: 'contour' },
  PAID: { label: 'Payée', tone: 'bleu' },
  REFUNDED: { label: 'Remboursée', tone: 'contour' },
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

export function filterToQuery(filter: OrderFilter): { status?: OrderStatus; paymentStatus?: PaymentStatus } {
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
