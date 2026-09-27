import type {
  BrandDto,
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
  StorefrontProductCardDto,
  StorefrontProductDto,
  StorefrontSort,
} from '@marche/contracts';

/** Lectures d'administration (CQRS : sans passer par les agrégats). */
export abstract class CatalogReadModel {
  abstract listProducts(query: ProductListQuery): Promise<Paginated<ProductListItemDto>>;
  abstract getProduct(id: string): Promise<ProductDto | null>;
  abstract listBrands(query: BrandListQuery): Promise<Paginated<BrandDto>>;
  abstract getBrand(id: string): Promise<BrandDto | null>;
  abstract listCollections(query: CollectionListQuery): Promise<Paginated<CollectionDto>>;
  abstract getCollection(id: string): Promise<CollectionDetailDto | null>;
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
}
