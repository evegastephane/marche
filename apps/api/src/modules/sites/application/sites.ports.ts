import type { Site } from '../domain/site.aggregate.js';

export abstract class SiteRepository {
  /** Site de la boutique courante. */
  abstract findCurrent(): Promise<Site | null>;
  /** Résolution d'hôte (sans boutique dans le contexte : lecture système). */
  abstract findBySubdomain(subdomain: string): Promise<Site | null>;
  abstract insert(site: Site): Promise<void>;
  /** Lève ConcurrentModificationError si la version a changé entre-temps. */
  abstract update(site: Site): Promise<void>;
}

export interface PreviewClaims {
  siteId: string;
  storeId: string;
}

/** Jetons d'aperçu du thème en brouillon (HS256, 30 min). */
export abstract class PreviewTokens {
  abstract sign(claims: PreviewClaims): Promise<{ token: string; expiresAt: Date }>;
  abstract verify(token: string): Promise<PreviewClaims | null>;
}

/** Revalidation du cache du storefront (Next.js revalidateTag). */
export abstract class StorefrontRevalidator {
  abstract revalidate(tags: readonly string[], options: { immediate: boolean }): Promise<void>;
}

/** Cache de résolution sous-domaine → site (invalidé à chaque changement de statut). */
export abstract class SiteHostCache {
  abstract invalidate(subdomain: string): Promise<void>;
}

/** Tags de cache du storefront (docs/PLAN-CODE.md §6.6). */
export const cacheTags = {
  site: (subdomain: string) => `site:${subdomain}`,
  store: (storeId: string) => `store:${storeId}`,
  catalog: (storeId: string) => `catalog:${storeId}`,
  product: (productId: string) => `product:${productId}`,
  collection: (collectionId: string) => `collection:${collectionId}`,
};
