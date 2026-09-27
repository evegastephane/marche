import { Injectable } from '@nestjs/common';
import type {
  AvailabilityDto,
  Paginated,
  PublicOrderDto,
  StorefrontBrandDto,
  StorefrontCollectionDto,
  StorefrontProductCardDto,
  StorefrontProductDto,
  StorefrontProductListQuery,
  StorefrontStoreDto,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { MediaFacade } from '../../media/media.facade.js';
import { OrdersFacade } from '../../orders/orders.facade.js';
import { SitesFacade } from '../../sites/sites.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';

/** Lectures du site public (BFF) : composition des façades des modules. */
@Injectable()
export class StorefrontQueries {
  constructor(
    private readonly stores: StoresFacade,
    private readonly sites: SitesFacade,
    private readonly catalog: CatalogFacade,
    private readonly inventory: InventoryFacade,
    private readonly media: MediaFacade,
    private readonly orders: OrdersFacade,
    private readonly actor: ActorContext,
  ) {}

  /** Boutique, thème (brouillon en aperçu), navigation et médias du thème. */
  async store(preview: boolean): Promise<StorefrontStoreDto> {
    const settings = await this.stores.getSettings(this.actor.storeId);
    const site = await this.sites.currentTheme(preview);
    if (!site) throw new NotFoundError('Boutique');
    const [collections, hasProducts] = await Promise.all([
      this.catalog.listPublishedCollections(),
      this.catalog.hasActiveProducts(),
    ]);
    const heroImages = site.theme.sections.flatMap((section) =>
      section.type === 'hero' && section.imageMediaId ? [section.imageMediaId] : [],
    );
    const logoId = site.theme.logoMediaId ?? settings.logoMediaId;
    const media = await this.media.getMany([...heroImages, ...(logoId ? [logoId] : [])]);
    return {
      name: settings.name,
      slug: settings.slug,
      currency: settings.currency,
      contactEmail: settings.contactEmail,
      phone: settings.phone,
      logo: (logoId && media.get(logoId)) || null,
      templateId: site.templateId,
      templateVersion: site.templateVersion,
      theme: site.theme,
      themeMedia: Object.fromEntries(media),
      navigation: { collections: collections.map((c) => ({ title: c.title, slug: c.slug })) },
      hasProducts,
      preview,
    };
  }

  async products(query: StorefrontProductListQuery): Promise<Paginated<StorefrontProductCardDto>> {
    const page = await this.catalog.listProductCards({
      collectionSlug: query.collection,
      brandSlug: query.brand,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
    });
    if (!page) throw new NotFoundError('Catalogue', query.collection);
    return page;
  }

  async product(slug: string): Promise<StorefrontProductDto> {
    const product = await this.catalog.getPublishedProduct(slug);
    if (!product) throw new NotFoundError('Produit', slug);
    return product;
  }

  collections(): Promise<StorefrontCollectionDto[]> {
    return this.catalog.listPublishedCollections();
  }

  async collection(slug: string): Promise<StorefrontCollectionDto> {
    const collection = await this.catalog.getPublishedCollection(slug);
    if (!collection) throw new NotFoundError('Catalogue', slug);
    return collection;
  }

  brands(): Promise<StorefrontBrandDto[]> {
    return this.catalog.listBrandsWithProducts();
  }

  /** Disponible par variante ; null = stock non suivi (toujours disponible). */
  async availability(variantIds: string[]): Promise<AvailabilityDto> {
    const [snapshots, available] = await Promise.all([
      this.catalog.snapshotVariants(variantIds),
      this.inventory.availability(variantIds),
    ]);
    return {
      variants: variantIds.map((variantId) => {
        const snapshot = snapshots.get(variantId);
        if (!snapshot?.sellable) return { variantId, available: 0 };
        return { variantId, available: snapshot.trackInventory ? (available.get(variantId) ?? 0) : null };
      }),
    };
  }

  async order(publicToken: string): Promise<PublicOrderDto> {
    const order = await this.orders.getPublicOrder(publicToken);
    if (!order) throw new NotFoundError('Commande');
    return order;
  }
}
