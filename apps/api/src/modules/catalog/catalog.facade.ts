import { Injectable } from '@nestjs/common';
import type {
  Paginated,
  ProductDto,
  StorefrontBrandDto,
  StorefrontCollectionDto,
  StorefrontProductCardDto,
  StorefrontProductDto,
} from '@marche/contracts';
import {
  CatalogReadModel,
  CatalogStorefrontReadModel,
  type StorefrontProductFilter,
  type VariantSnapshot,
} from './application/catalog.read-model.js';

export type { VariantSnapshot, StorefrontProductFilter };

/** API publique du module catalog (commandes, panier, site, storefront). */
@Injectable()
export class CatalogFacade {
  constructor(
    private readonly storefront: CatalogStorefrontReadModel,
    private readonly admin: CatalogReadModel,
  ) {}

  /** R6 : titre, SKU et prix actuels des variantes, pour figer les lignes d'une commande. */
  snapshotVariants(variantIds: readonly string[]): Promise<Map<string, VariantSnapshot>> {
    return this.storefront.snapshotVariants(variantIds);
  }

  hasActiveProducts(): Promise<boolean> {
    return this.storefront.hasActiveProducts();
  }

  listPublishedCollections(): Promise<StorefrontCollectionDto[]> {
    return this.storefront.listCollections();
  }

  getPublishedCollection(slug: string): Promise<StorefrontCollectionDto | null> {
    return this.storefront.getCollection(slug);
  }

  listBrandsWithProducts(): Promise<StorefrontBrandDto[]> {
    return this.storefront.listBrands();
  }

  /** null si le catalogue demandé n'existe pas ou n'est pas publié. */
  listProductCards(filter: StorefrontProductFilter): Promise<Paginated<StorefrontProductCardDto> | null> {
    return this.storefront.listProductCards(filter);
  }

  getPublishedProduct(slug: string): Promise<StorefrontProductDto | null> {
    return this.storefront.getProduct(slug);
  }

  /** Produit de la boutique courante, quel que soit son statut (campagnes). */
  getProduct(id: string): Promise<ProductDto | null> {
    return this.admin.getProduct(id);
  }
}
