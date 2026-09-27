import { Module } from '@nestjs/common';
import { CreateStoreUseCase } from './application/create-store.use-case.js';
import {
  GetCurrentStoreQuery,
  UpdateCurrentStoreUseCase,
} from './application/current-store.use-cases.js';
import { OrganizationDirectory } from './application/organization-directory.port.js';
import { StoreCacheInvalidator } from './application/store-cache.port.js';
import { StoreMembershipRepository, StoreRepository } from './domain/store.repository.js';
import { ClerkOrganizationDirectory } from './infrastructure/clerk-organization-directory.js';
import {
  PrismaStoreMembershipRepository,
  PrismaStoreRepository,
} from './infrastructure/prisma-store.repository.js';
import { StoreCache } from './infrastructure/store-cache.js';
import { StoresController } from './interface/stores.controller.js';
import { StoresFacade } from './stores.facade.js';

@Module({
  controllers: [StoresController],
  providers: [
    { provide: StoreRepository, useClass: PrismaStoreRepository },
    { provide: StoreMembershipRepository, useClass: PrismaStoreMembershipRepository },
    { provide: OrganizationDirectory, useClass: ClerkOrganizationDirectory },
    StoreCache,
    { provide: StoreCacheInvalidator, useExisting: StoreCache },
    CreateStoreUseCase,
    GetCurrentStoreQuery,
    UpdateCurrentStoreUseCase,
    StoresFacade,
  ],
  exports: [StoresFacade],
})
export class StoresModule {}
