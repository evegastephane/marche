import { Inject, Injectable } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import {
  CLERK_CLIENT,
  ClerkNotConfiguredError,
  type MaybeClerkClient,
} from '../../../shared/infrastructure/clerk/clerk.module.js';
import {
  type AccessTokenClaims,
  AccessTokenVerifier,
  UserDirectory,
} from '../application/identity.ports.js';
import type { UserProfile } from '../domain/user.repository.js';

/**
 * Extrait les claims utiles d'un jeton de session Clerk.
 * Format v2 : organisation active dans `o` ({ id, rol, slg }) ; format v1 : org_id / org_role.
 */
export function claimsFromPayload(payload: Record<string, unknown>): AccessTokenClaims {
  const organization = (payload.o ?? undefined) as { id?: string; rol?: string; slg?: string } | undefined;
  const legacyRole = typeof payload.org_role === 'string' ? payload.org_role : undefined;
  return {
    sub: String(payload.sub),
    orgId: organization?.id ?? (typeof payload.org_id === 'string' ? payload.org_id : undefined),
    orgRole: organization?.rol ?? legacyRole?.replace(/^org:/, ''),
    orgSlug: organization?.slg ?? (typeof payload.org_slug === 'string' ? payload.org_slug : undefined),
  };
}

/** Vérifie la signature (JWKS ou clé PEM), l'expiration et l'émetteur autorisé (azp). */
@Injectable()
export class ClerkAccessTokenVerifier extends AccessTokenVerifier {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const { jwtKey, secretKey, authorizedParties } = this.config.clerk;
    if (!jwtKey && !secretKey) throw new ClerkNotConfiguredError();
    const payload = await verifyToken(token, {
      jwtKey,
      secretKey,
      authorizedParties: authorizedParties.length > 0 ? authorizedParties : undefined,
    });
    return claimsFromPayload(payload as unknown as Record<string, unknown>);
  }
}

@Injectable()
export class ClerkUserDirectory extends UserDirectory {
  constructor(@Inject(CLERK_CLIENT) private readonly clerk: MaybeClerkClient) {
    super();
  }

  async getProfile(clerkUserId: string): Promise<UserProfile> {
    if (!this.clerk) throw new ClerkNotConfiguredError();
    const user = await this.clerk.users.getUser(clerkUserId);
    const email =
      user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? '';
    return {
      clerkUserId,
      email: email.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl || null,
    };
  }
}
