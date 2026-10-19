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
  /** Produits (archivés compris) de ces références : référence → id. */
  abstract productIdsByReference(references: readonly string[]): Promise<Map<string, string>>;
  abstract listBrands(query: BrandListQuery): Promise<Paginated<BrandDto>>;
  abstract getBrand(id: string): Promise<BrandDto | null>;
  abstract listCollections(query: CollectionListQuery): Promise<Paginated<CollectionDto>>;
  abstract getCollection(id: string): Promise<CollectionDetailDto | null>;
  abstract listBundles(filter: { anchorProductId?: string }): Promise<BundleDto[]>;
  abstract getBundle(id: string): Promise<BundleDto | null>;
  /** Caisse : variantes en vente ou en brouillon (ni archivées, ni d'un produit archivé), par titre, SKU, code-barres ou marque. */
  abstract searchSellableVariants(query: { q?: string; cursor?: string; limit: number }): Promise<Paginated<SellableVariant>>;
  /** Caisse : la variante d'un code-barres (exact) ou d'un SKU (sans tenir compte de la casse). */
  abstract findSellableVariantByCode(code: string): Promise<SellableVariant | null>;
  /** Caisse : ces variantes, si elles sont vendables (un IMEI lu donne sa variante). */
  abstract findSellableVariants(variantIds: readonly string[]): Promise<Map<string, SellableVariant>>;
}

/** Variante vendable au comptoir (le stock est lu à part, dans le module inventory). */
export interface SellableVariant {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  barcode: string | null;
  priceAmount: number;
  trackInventory: boolean;
  imageMediaId: string | null;
  productActive: boolean;
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
  /** Slug d'une catégorie : ses produits et ceux de ses sous-catégories. */
  categorySlug?: string;
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
  /** Catégories (non archivées) désignées par le thème : nom et slug, par identifiant. */
  abstract categoriesById(ids: readonly string[]): Promise<Map<string, { name: string; slug: string }>>;
  abstract getProduct(slug: string): Promise<StorefrontProductDto | null>;
  abstract facets(query: StorefrontFacetsQuery): Promise<StorefrontFacetsDto | null>;
  /** Packs actifs dont l'appareil figure parmi ces produits (calcul des remises). */
  abstract activeBundles(anchorProductIds: readonly string[]): Promise<PricingBundle[]>;
}
