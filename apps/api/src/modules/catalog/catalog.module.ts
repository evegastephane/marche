import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MediaModule } from '../media/media.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { BrandUseCases, CollectionUseCases } from './application/brand-collection.use-cases.js';
import { BundleUseCases } from './application/bundle.use-cases.js';
import { CatalogTemplateUseCases } from './application/catalog-template.use-cases.js';
import { AttributeUseCases, CategoryUseCases, TaxonomyContextService } from './application/taxonomy.use-cases.js';
import { CatalogQueries } from './application/catalog.queries.js';
import { CatalogReadModel, CatalogStorefrontReadModel } from './application/catalog.read-model.js';
import { TaxonomyQueries, TaxonomyReadModel } from './application/taxonomy.read-model.js';
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
  CatalogTemplateInstaller,
  CollectionRepository,
  ProductRepository,
  TaxonomyRepository,
} from './domain/catalog.repositories.js';
import { PrismaCatalogStorefrontReadModel } from './infrastructure/prisma-catalog-storefront.read-model.js';
import { PrismaCatalogReadModel } from './infrastructure/prisma-catalog.read-model.js';
import { PrismaTaxonomyReadModel } from './infrastructure/prisma-taxonomy.read-model.js';
import { PrismaCatalogTemplateInstaller, PrismaTaxonomyRepository } from './infrastructure/prisma-taxonomy.repositories.js';
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
import { AttributesController, CategoriesController } from './interface/taxonomy.controllers.js';
import { CatalogImportController } from './interface/catalog-import.controller.js';
import { CatalogImportUseCase } from './application/catalog-import/catalog-import.use-case.js';
import { CatalogWorkbook } from './application/catalog-import/catalog-workbook.port.js';
import { ExcelJsCatalogWorkbook } from './infrastructure/exceljs-catalog-workbook.js';

@Module({
  imports: [MediaModule, InventoryModule, StoresModule],
  controllers: [
    ProductsController,
    CategoriesController,
    AttributesController,
    BrandsController,
    CollectionsController,
    BundlesController,
    CatalogImportController,
  ],
  providers: [
    { provide: ProductRepository, useClass: PrismaProductRepository },
    { provide: BrandRepository, useClass: PrismaBrandRepository },
    { provide: CollectionRepository, useClass: PrismaCollectionRepository },
    { provide: BundleRepository, useClass: PrismaBundleRepository },
    { provide: CatalogTemplateInstaller, useClass: PrismaCatalogTemplateInstaller },
    { provide: TaxonomyRepository, useClass: PrismaTaxonomyRepository },
    { provide: CatalogReadModel, useClass: PrismaCatalogReadModel },
    { provide: CatalogStorefrontReadModel, useClass: PrismaCatalogStorefrontReadModel },
    { provide: TaxonomyReadModel, useClass: PrismaTaxonomyReadModel },
    { provide: CatalogWorkbook, useClass: ExcelJsCatalogWorkbook },
    CatalogImportUseCase,
    ProductWriteSupport,
    CreateProductUseCase,
    UpdateProductUseCase,
    ChangeProductStatusUseCase,
    DuplicateProductUseCase,
    BrandUseCases,
    CollectionUseCases,
    BundleUseCases,
    CatalogTemplateUseCases,
    TaxonomyContextService,
    CategoryUseCases,
    AttributeUseCases,
    CatalogQueries,
    TaxonomyQueries,
    CatalogFacade,
  ],
  exports: [CatalogFacade],
})
export class CatalogModule {}
