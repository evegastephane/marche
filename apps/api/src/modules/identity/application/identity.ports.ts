import type { UserProfile } from '../domain/user.repository.js';

export interface AccessTokenClaims {
  /** Identifiant Clerk de l'utilisateur. */
  sub: string;
  /** Organisation active (= boutique) et rôle dans celle-ci. */
  orgId?: string;
  orgRole?: string;
  orgSlug?: string;
}

/** Vérifie un jeton de session (Clerk) et en extrait les claims utiles. */
export abstract class AccessTokenVerifier {
  abstract verify(token: string): Promise<AccessTokenClaims>;
}

/** Annuaire des utilisateurs (Clerk) : profil lu lors de la première requête d'un utilisateur. */
export abstract class UserDirectory {
  abstract getProfile(clerkUserId: string): Promise<UserProfile>;
}
