import { Injectable } from '@nestjs/common';
import type {
  Paginated,
  ProductDto,
  StorefrontBrandDto,
  StorefrontCollectionDto,
  StorefrontFacetsDto,
  StorefrontFacetsQuery,
  StorefrontProductCardDto,
  StorefrontProductDto,
} from '@marche/contracts';
import {
  CatalogReadModel,
  CatalogStorefrontReadModel,
  type SellableVariant,
  type StorefrontProductFilter,
  type VariantSnapshot,
} from './application/catalog.read-model.js';
import { type BundleDiscount, type PricingLine, priceBundles } from './domain/bundle-pricing.js';

export type { VariantSnapshot, StorefrontProductFilter, BundleDiscount, PricingLine, SellableVariant };

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

  /** Catégories mises en avant par le thème du site (nom et slug pour le lien « Voir tout »). */
  categoriesById(ids: readonly string[]): Promise<Map<string, { name: string; slug: string }>> {
    return this.storefront.categoriesById(ids);
  }

  getPublishedProduct(slug: string): Promise<StorefrontProductDto | null> {
    return this.storefront.getProduct(slug);
  }

  /** Filtres du site (valeurs et nombre d'articles) ; null si le catalogue demandé n'est pas publié. */
  facets(query: StorefrontFacetsQuery): Promise<StorefrontFacetsDto | null> {
    return this.storefront.facets(query);
  }

  /** Remises des packs pour ces lignes (panier ou commande), toujours recalculées par le serveur. */
  async priceBundles(lines: readonly PricingLine[]): Promise<BundleDiscount[]> {
    const bundles = await this.storefront.activeBundles(lines.map((line) => line.productId));
    return priceBundles(bundles, lines);
  }

  /** Caisse : variantes vendables au comptoir (recherche). */
  searchSellableVariants(query: { q?: string; cursor?: string; limit: number }): Promise<Paginated<SellableVariant>> {
    return this.admin.searchSellableVariants(query);
  }

  /** Caisse : variante d'un code-barres ou d'un SKU lu à la douchette. */
  findSellableVariantByCode(code: string): Promise<SellableVariant | null> {
    return this.admin.findSellableVariantByCode(code);
  }

  findSellableVariants(variantIds: readonly string[]): Promise<Map<string, SellableVariant>> {
    return this.admin.findSellableVariants(variantIds);
  }

  /** Produit de la boutique courante, quel que soit son statut (campagnes). */
  getProduct(id: string): Promise<ProductDto | null> {
    return this.admin.getProduct(id);
  }
}
