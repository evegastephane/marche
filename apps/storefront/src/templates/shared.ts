import type { StorefrontStoreDto } from '@marche/contracts';

/** Initiales et monogramme d'une boutique (« Chez Awa » → « CA »). */
export function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/**
 * Liens du menu : les rayons (Femme, Homme, Enfant) quand la boutique range son site par rayon,
 * puis ses catalogues ; six au plus.
 */
export function navLinks(store: StorefrontStoreDto): { key: string; title: string; href: string }[] {
  return [
    // Une API plus ancienne que le site ne renvoie pas encore les services : pas de rayons.
    ...(store.services?.departments ?? []).map((d) => ({ key: `rayon-${d.value}`, title: d.label, href: `/collections?a=audience:${d.value}` })),
    ...store.navigation.collections.map((c) => ({ key: c.slug, title: c.title, href: `/collections/${c.slug}` })),
  ].slice(0, 6);
}
