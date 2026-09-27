import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module.js';

/** Cache-aside JSON sur Redis (docs/ARCHITECTURE.md §5.4). */
@Injectable()
export class JsonCache {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(...keys: string[]): Promise<void> {
    if (keys.length) await this.redis.del(...keys);
  }

  /** Lit la clé, sinon calcule la valeur, la met en cache et la retourne. Les `undefined` ne sont pas mis en cache. */
  async getOrSet<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await compute();
    if (value !== undefined) await this.set(key, value, ttlSeconds);
    return value;
  }
}
