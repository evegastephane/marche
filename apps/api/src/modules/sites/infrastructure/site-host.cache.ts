import { Injectable } from '@nestjs/common';
import { JsonCache } from '../../../shared/infrastructure/cache/json-cache.js';
import { SiteHostCache } from '../application/sites.ports.js';

export const hostCacheKey = (subdomain: string) => `sites:host:${subdomain}`;

@Injectable()
export class RedisSiteHostCache extends SiteHostCache {
  constructor(private readonly cache: JsonCache) {
    super();
  }

  async invalidate(subdomain: string): Promise<void> {
    await this.cache.delete(hostCacheKey(subdomain));
  }
}
