import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MediaModule } from '../media/media.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { BrandUseCases, CollectionUseCases } from './application/brand-collection.use-cases.js';
import { BundleUseCases } from './application/bundle.use-cases.js';
import { CatalogQueries } from './application/catalog.queries.js';
import { CatalogReadModel, CatalogStorefrontReadModel } from './application/catalog.read-model.js';
import {
  ChangeProductStatusUseCase,
  CreateProductUseCase,
  DuplicateProductUseCase,
  ProductWriteSupport,
  UpdateProductUseCase,
} from './application/product.use-cases.js';
import { CatalogFacade } from './catalog.facade.js';
import {
  BrandRepository,
  BundleRepository,
  CollectionRepository,
  ProductRepository,
} from './domain/catalog.repositories.js';
import { PrismaCatalogStorefrontReadModel } from './infrastructure/prisma-catalog-storefront.read-model.js';
import { PrismaCatalogReadModel } from './infrastructure/prisma-catalog.read-model.js';
import {
  PrismaBrandRepository,
  PrismaBundleRepository,
  PrismaCollectionRepository,
  PrismaProductRepository,
} from './infrastructure/prisma-catalog.repositories.js';
import {
  BrandsController,
  BundlesController,
  CollectionsController,
  ProductsController,
} from './interface/catalog.controllers.js';

@Module({
  imports: [MediaModule, InventoryModule, StoresModule],
  controllers: [ProductsController, BrandsController, CollectionsController, BundlesController],
  providers: [
    { provide: ProductRepository, useClass: PrismaProductRepository },
    { provide: BrandRepository, useClass: PrismaBrandRepository },
    { provide: CollectionRepository, useClass: PrismaCollectionRepository },
    { provide: BundleRepository, useClass: PrismaBundleRepository },
    { provide: CatalogReadModel, useClass: PrismaCatalogReadModel },
    { provide: CatalogStorefrontReadModel, useClass: PrismaCatalogStorefrontReadModel },
    ProductWriteSupport,
    CreateProductUseCase,
    UpdateProductUseCase,
    ChangeProductStatusUseCase,
    DuplicateProductUseCase,
    BrandUseCases,
    CollectionUseCases,
    BundleUseCases,
    CatalogQueries,
    CatalogFacade,
  ],
  exports: [CatalogFacade],
})
export class CatalogModule {}
