import type { MemberRole } from '../../../shared/application/actor-context.port.js';

export interface UserProfile {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

export abstract class UserRepository {
  abstract findIdByClerkId(clerkUserId: string): Promise<string | null>;
  /** Crée ou met à jour l'utilisateur (et annule une suppression). Retourne son id local. */
  abstract upsert(profile: UserProfile): Promise<string>;
  abstract markDeleted(clerkUserId: string): Promise<void>;
}

/** Rôle Clerk (« org:admin », « admin », « org:member »…) → rôle Marché. OWNER n'est jamais déduit de Clerk. */
export function roleFromClerk(clerkRole: string | undefined): MemberRole {
  return clerkRole?.replace(/^org:/, '') === 'admin' ? 'ADMIN' : 'STAFF';
}
