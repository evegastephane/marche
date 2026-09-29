import type {
  Paginated,
  StorefrontFacetsDto,
  StorefrontProductCardDto,
  StorefrontProductDto,
  StorefrontStoreDto,
} from '@marche/contracts';
import type { ComponentType, ReactNode } from 'react';
import type { CatalogParams } from '@/lib/catalog-query';
import type { Availability } from '@/lib/product';

export interface ProductPageProps {
  site: string;
  store: StorefrontStoreDto;
  product: StorefrontProductDto;
  availability: Availability;
}

export interface CatalogPageProps {
  site: string;
  store: StorefrontStoreDto;
  title: string;
  description: string | null;
  /** Chemin de la page (/collections ou /collections/ete), base des liens de filtre. */
  base: string;
  params: CatalogParams;
  products: Paginated<StorefrontProductCardDto>;
  facets: StorefrontFacetsDto;
  /** Catalogue affiché ; absent pour « Tous les produits ». */
  collectionSlug?: string;
}

/**
 * Contrat d'un template (Abstract Factory, docs/ARCHITECTURE.md §5.5) : une famille cohérente
 * d'en-tête, pied de page, accueil, fiche produit et catalogue. Panier et commande sont communs
 * et prennent la palette et les polices du template.
 */
export interface StorefrontTemplate {
  id: string;
  Header: ComponentType<{ store: StorefrontStoreDto; cartCount: number }>;
  Footer: ComponentType<{ store: StorefrontStoreDto }>;
  HomeSections: (props: { site: string; store: StorefrontStoreDto }) => ReactNode;
  ProductPage: (props: ProductPageProps) => ReactNode;
  CatalogPage: (props: CatalogPageProps) => ReactNode;
}
