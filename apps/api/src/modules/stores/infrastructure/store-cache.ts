import { Injectable } from '@nestjs/common';
import { JsonCache } from '../../../shared/infrastructure/cache/json-cache.js';
import { StoreCacheInvalidator } from '../application/store-cache.port.js';

/** Clés de cache des boutiques (résolution d'organisation, réglages, rôles). */
@Injectable()
export class StoreCache extends StoreCacheInvalidator {
  static readonly ORG_TTL = 300;
  /** Organisation sans boutique : durée courte, la boutique peut être en cours de création. */
  static readonly UNKNOWN_ORG_TTL = 30;
  static readonly SETTINGS_TTL = 60;
  static readonly MEMBER_TTL = 300;

  constructor(readonly cache: JsonCache) {
    super();
  }

  static orgKey(clerkOrgId: string): string {
    return `stores:org:${clerkOrgId}`;
  }

  static settingsKey(storeId: string): string {
    return `stores:settings:${storeId}`;
  }

  static memberKey(storeId: string, userId: string): string {
    return `stores:member:${storeId}:${userId}`;
  }

  async invalidate(storeId: string, clerkOrgId?: string): Promise<void> {
    await this.cache.delete(
      StoreCache.settingsKey(storeId),
      ...(clerkOrgId ? [StoreCache.orgKey(clerkOrgId)] : []),
    );
  }

  async invalidateMember(storeId: string, userId: string): Promise<void> {
    await this.cache.delete(StoreCache.memberKey(storeId, userId));
  }
}
