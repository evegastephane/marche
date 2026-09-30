import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port.js';
import { TenantContext } from '../../../shared/infrastructure/cls/tenant-context.js';
import { DynamicCorsOrigins } from '../../../shared/infrastructure/http/dynamic-cors.js';
import { hashApiKey, looksLikeApiKey } from '../domain/api-key.js';
import { ApiKeyRepository, type AuthenticatedApiKey } from './api-keys.ports.js';

/** Durée pendant laquelle la liste des origines autorisées (CORS) est gardée en mémoire. */
const ORIGINS_TTL_MS = 30_000;

/**
 * Reconnaît une clé pk_ ou sk_ dans une requête (avant toute boutique : lecture système) et
 * tient la liste des origines déclarées par les clés publiques, pour le CORS de /storefront/v1.
 */
@Injectable()
export class ApiKeyAuthenticator extends DynamicCorsOrigins {
  private origins: { values: Set<string>; expiresAt: number } | null = null;

  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly tenant: TenantContext,
    private readonly clock: Clock,
  ) {
    super();
  }

  async authenticate(token: string): Promise<AuthenticatedApiKey | null> {
    if (!looksLikeApiKey(token)) return null;
    const key = await this.tenant.runAsSystem(() => this.keys.findActiveByHash(hashApiKey(token)));
    if (key) {
      // Suivi « dernière utilisation » : ne ralentit ni ne fait échouer la requête.
      void this.tenant.runAsSystem(() => this.keys.touch(key.id, this.clock.now())).catch(() => undefined);
    }
    return key;
  }

  async isAllowedOrigin(origin: string): Promise<boolean> {
    const now = Date.now();
    if (!this.origins || this.origins.expiresAt < now) {
      const values = await this.tenant.runAsSystem(() => this.keys.activeOrigins());
      this.origins = { values: new Set(values), expiresAt: now + ORIGINS_TTL_MS };
    }
    return this.origins.values.has(origin);
  }

  /** Après une création, une modification ou une révocation : relire les origines au prochain appel. */
  invalidateOrigins(): void {
    this.origins = null;
  }
}
