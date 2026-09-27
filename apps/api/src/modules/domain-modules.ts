import { CatalogModule } from './catalog/catalog.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { MediaModule } from './media/media.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { StoresModule } from './stores/stores.module.js';

/** Modules métier, communs à l'API (contrôleurs) et au worker (abonnés aux événements). */
export const DOMAIN_MODULES = [
  StoresModule,
  IdentityModule,
  MediaModule,
  InventoryModule,
  CatalogModule,
  OrdersModule,
];
