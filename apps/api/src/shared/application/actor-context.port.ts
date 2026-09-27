export type MemberRole = 'OWNER' | 'ADMIN' | 'STAFF';

/**
 * Qui agit, pour quelle boutique. Renseigné par les guards (HTTP) ou par le worker (jobs).
 * Les use cases en dépendent sans connaître le mécanisme (CLS) qui le porte.
 */
export abstract class ActorContext {
  /** Boutique courante. Lève une erreur si aucune n'est définie. */
  abstract get storeId(): string;
  abstract get optionalStoreId(): string | undefined;
  /** Utilisateur local (null pour un acheteur, un webhook ou un job système). */
  abstract get userId(): string | null;
  /** Identifiant Clerk de l'utilisateur authentifié. */
  abstract get clerkUserId(): string | null;
  abstract get role(): MemberRole | null;
}
