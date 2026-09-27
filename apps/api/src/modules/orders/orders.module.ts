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
import { OrdersReadModel } from './application/orders.ports.js';
import { CustomerRepository, OrderRepository } from './domain/order.repositories.js';
import {
  PrismaCustomerRepository,
  PrismaOrderRepository,
} from './infrastructure/prisma-order.repositories.js';
import { PrismaOrdersReadModel } from './infrastructure/prisma-orders.read-model.js';
import { CustomersController, OrdersController } from './interface/orders.controllers.js';
import { OrdersFacade } from './orders.facade.js';

@Module({
  imports: [StoresModule, CatalogModule, InventoryModule],
  controllers: [OrdersController, CustomersController],
  providers: [
    { provide: OrderRepository, useClass: PrismaOrderRepository },
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: OrdersReadModel, useClass: PrismaOrdersReadModel },
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
