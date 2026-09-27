import { AnalyticsModule } from './analytics/analytics.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { MediaModule } from './media/media.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ReportingModule } from './reporting/reporting.module.js';
import { SitesModule } from './sites/sites.module.js';
import { StorefrontModule } from './storefront/storefront.module.js';
import { StoresModule } from './stores/stores.module.js';

/** Modules métier, communs à l'API (contrôleurs) et au worker (abonnés aux événements). */
export const DOMAIN_MODULES = [
  StoresModule,
  IdentityModule,
  MediaModule,
  InventoryModule,
  CatalogModule,
  OrdersModule,
  NotificationsModule,
  CheckoutModule,
  SitesModule,
  StorefrontModule,
  AnalyticsModule,
  ReportingModule,
];
