import { Injectable } from '@nestjs/common';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { cacheTags, SiteRepository, StorefrontRevalidator } from './sites.ports.js';

/**
 * UC-46 : après chaque modification visible sur le site, le worker demande au storefront
 * de revalider les pages concernées (tags de cache). Le thème et la mise en ligne sont immédiats ;
 * le catalogue utilise le « stale-while-revalidate ».
 */
@Injectable()
export class SiteRevalidationService {
  constructor(
    private readonly sites: SiteRepository,
    private readonly catalog: CatalogFacade,
    private readonly revalidator: StorefrontRevalidator,
  ) {}

  async handle(event: SerializedDomainEvent): Promise<void> {
    const site = await this.sites.findCurrent();
    if (!site) return; // pas encore de site : rien à revalider
    const storeId = event.storeId;
    const tags = new Set<string>();
    let immediate = false;

    if (event.type.startsWith('catalog.product.')) {
      tags.add(cacheTags.product(event.aggregateId)).add(cacheTags.catalog(storeId));
    } else if (event.type.startsWith('catalog.collection.')) {
      tags.add(cacheTags.collection(event.aggregateId)).add(cacheTags.catalog(storeId)).add(cacheTags.store(storeId));
    } else if (event.type.startsWith('catalog.brand.')) {
      tags.add(cacheTags.catalog(storeId));
    } else if (event.type === 'inventory.stock.out' || event.type === 'inventory.stock.back') {
      const variantId = (event.payload as { variantId?: string }).variantId ?? event.aggregateId;
      const snapshot = (await this.catalog.snapshotVariants([variantId])).get(variantId);
      if (snapshot) tags.add(cacheTags.product(snapshot.productId));
    } else if (event.type.startsWith('sites.') || event.type === 'stores.store.updated') {
      tags.add(cacheTags.site(site.subdomain)).add(cacheTags.store(storeId));
      immediate = true;
    }

    if (tags.size > 0) await this.revalidator.revalidate([...tags], { immediate });
  }
}
