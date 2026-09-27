/** Invalidation des caches de boutique après une écriture (implémentée sur Redis). */
export abstract class StoreCacheInvalidator {
  abstract invalidate(storeId: string, clerkOrgId?: string): Promise<void>;
  abstract invalidateMember(storeId: string, userId: string): Promise<void>;
}
