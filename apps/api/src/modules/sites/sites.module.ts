import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { SiteRevalidationService } from './application/site-revalidation.service.js';
import { GenerateSiteUseCase, SiteDtoMapper, SiteUseCases } from './application/site.use-cases.js';
import {
  PreviewTokens,
  SiteHostCache,
  SiteRepository,
  StorefrontRevalidator,
} from './application/sites.ports.js';
import { RedisSiteHostCache } from './infrastructure/site-host.cache.js';
import {
  HttpStorefrontRevalidator,
  JosePreviewTokens,
  PrismaSiteRepository,
} from './infrastructure/sites.adapters.js';
import { SitesController } from './interface/sites.controller.js';
import { SitesEventHandlers } from './interface/sites.event-handlers.js';
import { SitesFacade } from './sites.facade.js';

@Module({
  imports: [StoresModule, CatalogModule],
  controllers: [SitesController],
  providers: [
    { provide: SiteRepository, useClass: PrismaSiteRepository },
    { provide: PreviewTokens, useClass: JosePreviewTokens },
    { provide: StorefrontRevalidator, useClass: HttpStorefrontRevalidator },
    { provide: SiteHostCache, useClass: RedisSiteHostCache },
    SiteDtoMapper,
    GenerateSiteUseCase,
    SiteUseCases,
    SiteRevalidationService,
    SitesEventHandlers,
    SitesFacade,
  ],
  exports: [SitesFacade],
})
export class SitesModule {}
