import { ThrottlerModule } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { STOREFRONT_HEADERS } from '@marche/contracts';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { REDIS } from '../redis/redis.module.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

interface TrackedRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

function header(request: TrackedRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Qui compter ? Les appels du storefront arrivent tous depuis son serveur :
 * on utilise alors l'IP de l'acheteur qu'il transmet (seulement si son jeton est valide).
 */
export function throttleTracker(request: TrackedRequest, config: AppConfig): string {
  const clientIp = header(request, STOREFRONT_HEADERS.clientIp);
  if (clientIp && header(request, STOREFRONT_HEADERS.token) === config.storefront.apiToken) {
    return `storefront:${clientIp}`;
  }
  return request.ip ?? 'unknown';
}

/** Limitation de débit (docs/PLAN-CODE.md P5-04) : RATE_LIMIT_PER_MINUTE (120 par défaut), compteurs dans Redis. */
export function createThrottlingModule() {
  return ThrottlerModule.forRootAsync({
    inject: [APP_CONFIG, REDIS],
    useFactory: (config: AppConfig, redis: Redis) => ({
      throttlers: [{ name: 'default', ttl: 60_000, limit: config.rateLimit.perMinute }],
      storage: new RedisThrottlerStorage(redis),
      getTracker: (request: Record<string, unknown>) =>
        throttleTracker(request as unknown as TrackedRequest, config),
    }),
  });
}
