import type { StoreDto } from '@marche/contracts';
import type { Store } from '../domain/store.aggregate.js';

export function toStoreDto(store: Store): StoreDto {
  const s = store.snapshot();
  return {
    id: store.id,
    clerkOrgId: store.clerkOrgId,
    name: s.name,
    slug: s.slug,
    currency: s.currency,
    country: s.country,
    timezone: s.timezone,
    contactEmail: s.contactEmail,
    phone: s.phone,
    logoMediaId: s.logoMediaId,
    shippingSettings: s.shippingSettings,
    lowStockDefault: s.lowStockDefault,
    createdAt: s.createdAt.toISOString(),
  };
}
