import { createHash } from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  applyDecorators,
  UseInterceptors,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { ApiHeader } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Redis } from 'ioredis';
import { catchError, from, mergeMap, type Observable, of, throwError } from 'rxjs';
import { ConflictError, ValidationError } from '../../domain/domain-error.js';
import { TenantContext } from '../cls/tenant-context.js';
import { REDIS } from '../redis/redis.module.js';
import type { MarcheRequest } from './marche-request.js';

const TTL_SECONDS = 24 * 60 * 60;

interface StoredResult {
  state: 'processing' | 'done';
  fingerprint: string;
  statusCode?: number;
  body?: unknown;
}

/**
 * Idempotency-Key (docs/PLAN-CODE.md P3-04) : la première requête réserve la clé (SET NX),
 * une requête identique concurrente reçoit 409, une requête rejouée reçoit la réponse stockée.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly tenant: TenantContext,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<MarcheRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const key = request.header('idempotency-key')?.trim();
    if (!key || key.length > 200) {
      throw new ValidationError(
        'IDEMPOTENCY_KEY_REQUIRED',
        'En-tête Idempotency-Key obligatoire (200 caractères maximum)',
      );
    }

    const scope = this.tenant.optionalStoreId ?? 'public';
    const path = request.originalUrl.split('?')[0];
    const redisKey = `idem:${scope}:${request.method}:${path}:${key}`;
    const fingerprint = createHash('sha256').update(JSON.stringify(request.body ?? null)).digest('hex');

    const acquired = await this.redis.set(
      redisKey,
      JSON.stringify({ state: 'processing', fingerprint } satisfies StoredResult),
      'EX',
      TTL_SECONDS,
      'NX',
    );

    if (acquired === null) {
      const raw = await this.redis.get(redisKey);
      const stored = raw ? (JSON.parse(raw) as StoredResult) : null;
      if (stored && stored.fingerprint !== fingerprint) {
        throw new ConflictError(
          'IDEMPOTENCY_KEY_REUSED',
          'Cette clé d’idempotence a déjà servi pour une autre requête',
        );
      }
      if (!stored || stored.state === 'processing') {
        throw new ConflictError('IDEMPOTENCY_IN_PROGRESS', 'Une requête identique est en cours de traitement');
      }
      response.status(stored.statusCode ?? 200);
      response.setHeader('Idempotent-Replayed', 'true');
      return of(stored.body);
    }

    const statusCode =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, context.getHandler()) ??
      (request.method === 'POST' ? 201 : 200);

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.redis.set(
            redisKey,
            JSON.stringify({ state: 'done', fingerprint, statusCode, body } satisfies StoredResult),
            'EX',
            TTL_SECONDS,
          ),
        ).pipe(mergeMap(() => of(body))),
      ),
      catchError((error: unknown) =>
        // En cas d'échec, la clé est libérée : le client peut réessayer.
        from(this.redis.del(redisKey)).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }
}

/** Rend une route idempotente : l'en-tête Idempotency-Key devient obligatoire. */
export const Idempotent = () =>
  applyDecorators(
    UseInterceptors(IdempotencyInterceptor),
    ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Identifiant unique de la tentative' }),
  );
