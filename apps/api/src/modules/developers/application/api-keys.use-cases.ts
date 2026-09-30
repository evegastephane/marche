import { Injectable } from '@nestjs/common';
import type { ApiKeyDto, CreateApiKeyInput, CreatedApiKeyDto, UpdateApiKeyInput } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { generateApiKey } from '../domain/api-key.js';
import { ApiKeyAuthenticator } from './api-key-authenticator.js';
import { ApiKeyRepository } from './api-keys.ports.js';

/** Au-delà, une boutique a sûrement oublié de révoquer ses anciennes clés. */
const MAX_ACTIVE_KEYS = 20;

/** Clés d'API de la boutique : création (montrée une fois), réglages, révocation. */
@Injectable()
export class ApiKeyUseCases {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly authenticator: ApiKeyAuthenticator,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  list(): Promise<ApiKeyDto[]> {
    return this.keys.list();
  }

  async create(input: CreateApiKeyInput): Promise<CreatedApiKeyDto> {
    if ((await this.keys.countActive()) >= MAX_ACTIVE_KEYS) {
      throw new ValidationError('VALIDATION_FAILED', `${MAX_ACTIVE_KEYS} clés actives au plus : révoquez celles qui ne servent plus`);
    }
    const generated = generateApiKey(input.kind);
    const id = newId();
    await this.keys.insert({
      id,
      storeId: this.actor.storeId,
      name: input.name,
      kind: input.kind,
      tokenHash: generated.tokenHash,
      token: input.kind === 'PUBLISHABLE' ? generated.token : null,
      prefix: generated.prefix,
      last4: generated.last4,
      scopes: input.kind === 'SECRET' ? input.scopes : [],
      allowedOrigins: input.kind === 'PUBLISHABLE' ? input.allowedOrigins : [],
      createdById: this.actor.userId,
    });
    this.authenticator.invalidateOrigins();
    return { ...(await this.get(id)), secret: generated.token };
  }

  async update(id: string, input: UpdateApiKeyInput): Promise<ApiKeyDto> {
    const current = await this.get(id);
    if (current.revokedAt) throw new ValidationError('VALIDATION_FAILED', 'Cette clé est révoquée');
    if (current.kind === 'PUBLISHABLE' && input.scopes) {
      throw new ValidationError('VALIDATION_FAILED', 'Une clé publique n’a pas de droits : elle ouvre seulement /storefront/v1', { field: 'scopes' });
    }
    if (current.kind === 'SECRET' && input.allowedOrigins) {
      throw new ValidationError('VALIDATION_FAILED', 'Une clé secrète ne s’utilise jamais depuis un navigateur', { field: 'allowedOrigins' });
    }
    await this.keys.update(id, input);
    this.authenticator.invalidateOrigins();
    return this.get(id);
  }

  /** Irréversible : les applications qui l'utilisent perdent l'accès immédiatement. */
  async revoke(id: string): Promise<ApiKeyDto> {
    const current = await this.get(id);
    if (!current.revokedAt) await this.keys.revoke(id, this.clock.now());
    this.authenticator.invalidateOrigins();
    return this.get(id);
  }

  private async get(id: string): Promise<ApiKeyDto> {
    const key = await this.keys.get(id);
    if (!key) throw new NotFoundError('Clé d’API', id);
    return key;
  }
}
