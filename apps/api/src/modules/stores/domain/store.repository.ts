import type { MemberRole } from '../../../shared/application/actor-context.port.js';
import type { Store } from './store.aggregate.js';

export abstract class StoreRepository {
  abstract findById(id: string): Promise<Store | null>;
  abstract findByClerkOrgId(clerkOrgId: string): Promise<Store | null>;
  abstract slugExists(slug: string): Promise<boolean>;
  /** Crée la boutique et son compteur de commandes. */
  abstract insert(store: Store): Promise<void>;
  abstract update(store: Store): Promise<void>;
  /** Incrémente atomiquement le compteur de commandes (R8) dans la transaction courante. */
  abstract nextOrderNumber(storeId: string): Promise<number>;
}

export abstract class StoreMembershipRepository {
  abstract findRole(storeId: string, userId: string): Promise<MemberRole | null>;
  /** Crée ou met à jour le rôle. Un OWNER reste OWNER. Retourne le rôle effectif. */
  abstract upsert(storeId: string, userId: string, role: MemberRole): Promise<MemberRole>;
  abstract remove(storeId: string, userId: string): Promise<void>;
  /** E-mails des propriétaires (destinataires des notifications marchand). */
  abstract ownerEmails(storeId: string): Promise<string[]>;
}
