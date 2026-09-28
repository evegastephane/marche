import type { Address } from '@marche/contracts';
import type { Order } from './order.aggregate.js';

export abstract class OrderRepository {
  abstract findById(id: string): Promise<Order | null>;
  abstract insert(order: Order): Promise<void>;
  /** Lève ConcurrentModificationError si la version a changé entre-temps. */
  abstract update(order: Order): Promise<void>;
}

export interface CustomerDetails {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  defaultAddress?: Address | null;
  /** Case cochée au paiement : consentement aux nouveautés par WhatsApp (annule une désinscription passée). */
  whatsappOptIn?: boolean;
}

/** Client joignable par une campagne WhatsApp. */
export interface WhatsAppRecipient {
  customerId: string;
  firstName: string | null;
  phone: string;
}

export abstract class CustomerRepository {
  /** Crée ou complète le client identifié par son e-mail (unique par boutique). Retourne son id. */
  abstract upsertByEmail(details: CustomerDetails): Promise<string>;
  /** Clients de la boutique courante qui ont accepté les nouveautés WhatsApp, sans désinscription, avec un numéro. */
  abstract listWhatsAppRecipients(): Promise<WhatsAppRecipient[]>;
  /**
   * « STOP » reçu d'un numéro : désinscrit, dans toutes les boutiques, les clients dont le numéro
   * se termine par ces chiffres (contexte système). Retourne le nombre de fiches désinscrites.
   */
  abstract optOutWhatsApp(phoneSuffix: string, at: Date): Promise<number>;
}
