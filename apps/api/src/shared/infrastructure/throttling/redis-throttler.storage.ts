import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/** Compteurs de limitation de débit partagés entre les instances de l'API (fenêtre fixe). */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitsKey}:blocked`;

    const blockedFor = await this.redis.pttl(blockKey);
    if (blockedFor > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(blockedFor / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockedFor / 1000),
      };
    }

    const results = await this.redis.multi().incr(hitsKey).pexpire(hitsKey, ttl, 'NX').pttl(hitsKey).exec();
    const totalHits = Number(results?.[0]?.[1] ?? 1);
    const remaining = Math.max(Number(results?.[2]?.[1] ?? ttl), 0);

    if (totalHits > limit) {
      await this.redis.set(blockKey, '1', 'PX', Math.max(blockDuration, 1));
      return {
        totalHits,
        timeToExpire: Math.ceil(remaining / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockDuration / 1000),
      };
    }
    return { totalHits, timeToExpire: Math.ceil(remaining / 1000), isBlocked: false, timeToBlockExpire: 0 };
  }
}
