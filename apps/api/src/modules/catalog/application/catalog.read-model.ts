import type {
  BrandDto,
  BundleDto,
  BrandListQuery,
  CollectionDetailDto,
  CollectionDto,
  CollectionListQuery,
  Paginated,
  ProductDto,
  ProductListItemDto,
  ProductListQuery,
  StorefrontBrandDto,
  StorefrontCollectionDto,
  StorefrontFacetsDto,
  StorefrontFacetsQuery,
  StorefrontProductCardDto,
  StorefrontProductDto,
  StorefrontSort,
  OptionType,
  ProductKind,
} from '@marche/contracts';
import type { PricingBundle } from '../domain/bundle-pricing.js';

/** Lectures d'administration (CQRS : sans passer par les agrégats). */
export abstract class CatalogReadModel {
  abstract listProducts(query: ProductListQuery): Promise<Paginated<ProductListItemDto>>;
  abstract getProduct(id: string): Promise<ProductDto | null>;
  abstract listBrands(query: BrandListQuery): Promise<Paginated<BrandDto>>;
  abstract getBrand(id: string): Promise<BrandDto | null>;
  abstract listCollections(query: CollectionListQuery): Promise<Paginated<CollectionDto>>;
  abstract getCollection(id: string): Promise<CollectionDetailDto | null>;
  abstract listBundles(filter: { anchorProductId?: string }): Promise<BundleDto[]>;
  abstract getBundle(id: string): Promise<BundleDto | null>;
}

/** Instantané d'une variante au moment d'une commande (R6). */
export interface VariantSnapshot {
  variantId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  unitPriceAmount: number;
  compareAtAmount: number | null;
  trackInventory: boolean;
  imageMediaId: string | null;
  variantArchived: boolean;
  /** Variante active d'un produit publié : peut être vendue sur le site. */
  sellable: boolean;
}

export interface StorefrontProductFilter {
  collectionSlug?: string;
  brandSlug?: string;
  kind?: ProductKind;
  /** Valeurs d'options par nature (même nature = « ou », natures différentes = « et »). */
  options?: { type: OptionType; values: string[] }[];
  /** Attributs filtrables (rayon, type d'accessoire…). */
  attributes?: { key: string; values: string[] }[];
  priceMin?: number;
  priceMax?: number;
  sort: StorefrontSort;
  cursor?: string;
  limit: number;
}

/** Lectures du site public : uniquement ce qui est publié. */
export abstract class CatalogStorefrontReadModel {
  abstract snapshotVariants(variantIds: readonly string[]): Promise<Map<string, VariantSnapshot>>;
  abstract hasActiveProducts(): Promise<boolean>;
  abstract listCollections(): Promise<StorefrontCollectionDto[]>;
  abstract getCollection(slug: string): Promise<StorefrontCollectionDto | null>;
  abstract listBrands(): Promise<StorefrontBrandDto[]>;
  abstract listProductCards(filter: StorefrontProductFilter): Promise<Paginated<StorefrontProductCardDto> | null>;
  abstract getProduct(slug: string): Promise<StorefrontProductDto | null>;
  abstract facets(query: StorefrontFacetsQuery): Promise<StorefrontFacetsDto | null>;
  /** Packs actifs dont l'appareil figure parmi ces produits (calcul des remises). */
  abstract activeBundles(anchorProductIds: readonly string[]): Promise<PricingBundle[]>;
}
