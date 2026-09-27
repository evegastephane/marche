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
}

export abstract class CustomerRepository {
  /** Crée ou complète le client identifié par son e-mail (unique par boutique). Retourne son id. */
  abstract upsertByEmail(details: CustomerDetails): Promise<string>;
}
