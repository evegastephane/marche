import {
  answeredFaqItems,
  type FaqItem,
  type MediaDto,
  type Section,
  type StorefrontProductCardDto,
  type StorefrontStoreDto,
} from '@marche/contracts';
import type { ReactNode } from 'react';
import { getCollections, getProducts, StorefrontApiError } from '@/lib/storefront-api';

/**
 * Ce que les huit modèles partagent pour l'accueil : l'ordre et le repérage des sections,
 * les données de chaque type. Chaque modèle ne garde que sa mise en forme.
 */

export type SectionOf<T extends Section['type']> = Extract<Section, { type: T }>;

/**
 * Sections visibles, dans l'ordre choisi par le marchand. Chacune est repérée par `data-section-id`
 * (enveloppe sans boîte, `display: contents`) : l'éditeur du dashboard fait défiler l'aperçu jusqu'à elle.
 */
export function SectionList({
  store,
  children,
}: {
  store: StorefrontStoreDto;
  children: (section: Section) => ReactNode;
}) {
  return store.theme.sections
    .filter((section) => section.enabled)
    .map((section) => (
      <div key={section.id} data-section-id={section.id} className="contents">
        {children(section)}
      </div>
    ));
}

export interface FeaturedSelection {
  title: string;
  description: string | null;
  /** « Voir tout » : le catalogue filtré sur la catégorie, ou la page de l'ancien catalogue. */
  href: string;
  products: StorefrontProductCardDto[];
}

/**
 * Produits d'une sélection : ceux de la catégorie choisie, sous-catégories comprises ; à défaut,
 * ceux du catalogue choisi quand les catalogues existaient encore dans le dashboard. Vide : rien.
 */
export async function featuredSelection(
  site: string,
  store: StorefrontStoreDto,
  section: SectionOf<'featured-collection'>,
): Promise<FeaturedSelection | null> {
  const categoryId = section.categoryId ?? null;
  if (categoryId) {
    const category = store.themeCategories[categoryId];
    if (!category) return null;
    const products = await getProducts(site, store.id, { category: category.slug, limit: section.limit }).catch(
      (error: unknown) => {
        // Catégorie archivée entre-temps : la section se retire plutôt que de casser l'accueil.
        if (error instanceof StorefrontApiError && error.status === 404) return null;
        throw error;
      },
    );
    if (!products || products.items.length === 0) return null;
    return {
      title: section.title || category.name,
      description: null,
      href: `/collections?categorie=${encodeURIComponent(category.slug)}`,
      products: products.items,
    };
  }
  if (!section.collectionId) return null;
  const collection = (await getCollections(site, store.id)).find((c) => c.id === section.collectionId);
  if (!collection) return null;
  const products = await getProducts(site, store.id, { collection: collection.slug, limit: section.limit });
  if (products.items.length === 0) return null;
  return {
    title: section.title || collection.title,
    description: collection.description,
    href: `/collections/${collection.slug}`,
    products: products.items,
  };
}

/** Paragraphes d'un texte simple : chaque ligne non vide en est un. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function sectionImage(store: StorefrontStoreDto, mediaId: string | null | undefined): MediaDto | undefined {
  return mediaId ? store.themeMedia[mediaId] : undefined;
}

export interface ContactLine {
  kind: 'whatsapp' | 'phone' | 'email';
  /** Ce que fait le lien : « Écrire sur WhatsApp », « Appeler », « Écrire un e-mail ». */
  action: string;
  /** Le numéro ou l'adresse, tel que la boutique l'a saisi. */
  value: string;
  href: string;
}

/** Moyens de contact montrés par la section : ceux cochés par le marchand et renseignés dans ses Paramètres. */
export function contactLines(store: StorefrontStoreDto, section: SectionOf<'contact'>): ContactLine[] {
  const lines: ContactLine[] = [];
  if (section.showWhatsapp && store.whatsapp && store.phone) {
    const text = encodeURIComponent(`Bonjour ${store.name}, `);
    lines.push({ kind: 'whatsapp', action: 'Écrire sur WhatsApp', value: store.phone, href: `https://wa.me/${store.whatsapp}?text=${text}` });
  }
  if (section.showPhone && store.phone) {
    lines.push({ kind: 'phone', action: 'Appeler', value: store.phone, href: `tel:${store.phone.replace(/[^\d+]/g, '')}` });
  }
  if (section.showEmail && store.contactEmail) {
    lines.push({ kind: 'email', action: 'Écrire un e-mail', value: store.contactEmail, href: `mailto:${store.contactEmail}` });
  }
  return lines;
}

/** Une section contact sans moyen de joindre la boutique ni adresse ne s'affiche pas. */
export function hasContact(section: SectionOf<'contact'>, lines: readonly ContactLine[]): boolean {
  return lines.length > 0 || Boolean(section.address?.trim() || section.hours?.trim());
}

/** Questions prêtes à paraître : une question et sa réponse (les brouillons restent dans le dashboard). */
export function faqItemsOf(section: SectionOf<'faq'>): FaqItem[] {
  return answeredFaqItems(section);
}
