import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CheckoutModule } from '../checkout/checkout.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { SitesModule } from '../sites/sites.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { StorefrontQueries } from './application/storefront.queries.js';
import {
  StorefrontCartController,
  StorefrontCatalogController,
  StorefrontCheckoutController,
} from './interface/storefront.controllers.js';
import { StorefrontGuard } from './interface/storefront.guard.js';

/** API publique des sites générés (BFF) : ne dépend que des façades des autres modules. */
@Module({
  imports: [StoresModule, SitesModule, CatalogModule, InventoryModule, MediaModule, CheckoutModule, OrdersModule],
  controllers: [StorefrontCatalogController, StorefrontCartController, StorefrontCheckoutController],
  providers: [StorefrontGuard, StorefrontQueries],
})
export class StorefrontModule {}
