import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { reportRedisError } from './connection-errors.js';

/** Client Redis applicatif (cache, paniers, idempotence, rate limiting). BullMQ a ses propres connexions. */
export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: false });
        // Sans écouteur, ioredis écrit « Unhandled error event » à chaque coupure ; il se reconnecte seul.
        redis.on('error', (error) => reportRedisError('cache', error));
        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
