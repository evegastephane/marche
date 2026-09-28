import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
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
import { SpecialRequestUseCases } from './application/special-request.use-cases.js';
import { CustomerRepository, OrderRepository, SpecialRequestRepository } from './domain/order.repositories.js';
import {
  PrismaCustomerRepository,
  PrismaOrderRepository,
} from './infrastructure/prisma-order.repositories.js';
import { PrismaOrdersReadModel } from './infrastructure/prisma-orders.read-model.js';
import {
  PrismaSpecialRequestRepository,
  PrismaSpecialRequestsReadModel,
} from './infrastructure/prisma-special-requests.js';
import { CustomersController, OrdersController, SpecialRequestsController } from './interface/orders.controllers.js';
import { OrdersFacade } from './orders.facade.js';

@Module({
  imports: [StoresModule, CatalogModule, InventoryModule],
  controllers: [OrdersController, CustomersController, SpecialRequestsController],
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
    OrdersFacade,
  ],
  exports: [OrdersFacade],
})
export class OrdersModule {}
