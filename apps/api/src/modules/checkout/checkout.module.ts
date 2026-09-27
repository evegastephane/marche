import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CartRepository } from './application/cart.repository.js';
import { CartService } from './application/cart.service.js';
import { RedisCartRepository } from './infrastructure/redis-cart.repository.js';

/** Panier et checkout invité ; exposés par le module storefront (BFF). */
@Module({
  imports: [CatalogModule, InventoryModule, MediaModule, OrdersModule, StoresModule],
  providers: [{ provide: CartRepository, useClass: RedisCartRepository }, CartService],
  exports: [CartService],
})
export class CheckoutModule {}
