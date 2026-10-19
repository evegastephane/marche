import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MediaModule } from '../media/media.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { OrderPlacementService } from './application/order-placement.service.js';
import {
  CreateDraftOrderUseCase,
  OrderDtoLoader,
  OrderLifecycleUseCases,
  PlaceOrderUseCase,
  PlaceStorefrontOrderUseCase,
  UpdateDraftOrderUseCase,
} from './application/order.use-cases.js';
import { OrdersReadModel, SpecialRequestsReadModel } from './application/orders.ports.js';
import { PosLedger, PosReadModel, PosSessionRepository, PosSettingsStore } from './application/pos.ports.js';
import {
  PosCatalogQueries,
  PosReturnUseCase,
  PosSalesQueries,
  PosSaleUseCase,
  PosSessionUseCases,
  PosSettingsUseCases,
} from './application/pos.use-cases.js';
import { SpecialRequestUseCases } from './application/special-request.use-cases.js';
import { CustomerRepository, OrderRepository, SpecialRequestRepository } from './domain/order.repositories.js';
import {
  PrismaCustomerRepository,
  PrismaOrderRepository,
} from './infrastructure/prisma-order.repositories.js';
import { PrismaOrdersReadModel } from './infrastructure/prisma-orders.read-model.js';
import { PrismaPosReadModel } from './infrastructure/prisma-pos.read-model.js';
import { PrismaPosLedger, PrismaPosSessionRepository, PrismaPosSettingsStore } from './infrastructure/prisma-pos.repositories.js';
import {
  PrismaSpecialRequestRepository,
  PrismaSpecialRequestsReadModel,
} from './infrastructure/prisma-special-requests.js';
import { CustomersController, OrdersController, SpecialRequestsController } from './interface/orders.controllers.js';
import { PosController } from './interface/pos.controller.js';
import { OrdersFacade } from './orders.facade.js';

@Module({
  imports: [StoresModule, CatalogModule, InventoryModule, MediaModule],
  controllers: [OrdersController, CustomersController, SpecialRequestsController, PosController],
  providers: [
    { provide: OrderRepository, useClass: PrismaOrderRepository },
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: OrdersReadModel, useClass: PrismaOrdersReadModel },
    { provide: SpecialRequestRepository, useClass: PrismaSpecialRequestRepository },
    { provide: SpecialRequestsReadModel, useClass: PrismaSpecialRequestsReadModel },
    SpecialRequestUseCases,
    OrderPlacementService,
    OrderDtoLoader,
    CreateDraftOrderUseCase,
    UpdateDraftOrderUseCase,
    PlaceOrderUseCase,
    OrderLifecycleUseCases,
    PlaceStorefrontOrderUseCase,
    { provide: PosSessionRepository, useClass: PrismaPosSessionRepository },
    { provide: PosLedger, useClass: PrismaPosLedger },
    { provide: PosSettingsStore, useClass: PrismaPosSettingsStore },
    { provide: PosReadModel, useClass: PrismaPosReadModel },
    PosSettingsUseCases,
    PosSessionUseCases,
    PosCatalogQueries,
    PosSaleUseCase,
    PosReturnUseCase,
    PosSalesQueries,
    OrdersFacade,
  ],
  exports: [OrdersFacade],
})
export class OrdersModule {}
