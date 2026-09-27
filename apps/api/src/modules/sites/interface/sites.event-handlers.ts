import { Injectable } from '@nestjs/common';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import { OnDomainEvent } from '../../../shared/infrastructure/queue/on-domain-event.decorator.js';
import { SiteRevalidationService } from '../application/site-revalidation.service.js';

const revalidate = (event: string) =>
  OnDomainEvent({ event, queue: 'site-publishing', name: `revalidate-${event}`, attempts: 3 });

/** UC-46 : chaque changement visible sur le site déclenche une revalidation du storefront. */
@Injectable()
export class SitesEventHandlers {
  constructor(private readonly revalidation: SiteRevalidationService) {}

  @revalidate('catalog.product.created')
  onProductCreated(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.product.updated')
  onProductUpdated(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.product.published')
  onProductPublished(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.product.unpublished')
  onProductUnpublished(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.product.archived')
  onProductArchived(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.collection.created')
  onCollectionCreated(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.collection.updated')
  onCollectionUpdated(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.collection.deleted')
  onCollectionDeleted(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.brand.updated')
  onBrandUpdated(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('catalog.brand.archived')
  onBrandArchived(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('inventory.stock.out')
  onStockOut(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('inventory.stock.back')
  onStockBack(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('sites.site.published')
  onSitePublished(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('sites.site.unpublished')
  onSiteUnpublished(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('sites.theme.published')
  onThemePublished(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }

  @revalidate('stores.store.updated')
  onStoreUpdated(event: SerializedDomainEvent) {
    return this.revalidation.handle(event);
  }
}
