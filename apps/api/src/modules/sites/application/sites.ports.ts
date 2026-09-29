import type { ThemeSettings } from '@marche/contracts';
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
  /** Session d'aperçu (identifiant du jeton) ; absente des jetons émis avant l'aperçu en direct. */
  session?: string;
}

/** Jetons d'aperçu du thème en brouillon (HS256, 30 min). Chaque jeton ouvre sa propre session. */
export abstract class PreviewTokens {
  abstract sign(claims: Omit<PreviewClaims, 'session'>): Promise<{ token: string; expiresAt: Date; session: string }>;
  abstract verify(token: string): Promise<PreviewClaims | null>;
}

/**
 * Réglages non enregistrés d'une session d'aperçu : l'éditeur les envoie à chaque modification,
 * le site les affiche à la place du brouillon, sans jamais toucher au brouillon ni au thème en ligne.
 */
export abstract class PreviewThemeStore {
  abstract save(siteId: string, session: string, settings: ThemeSettings): Promise<void>;
  abstract find(siteId: string, session: string): Promise<ThemeSettings | null>;
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
