import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { InventoryReadModel, InventoryRepository } from './application/inventory.ports.js';
import { InventoryService } from './application/inventory.service.js';
import { InventoryFacade } from './inventory.facade.js';
import { PrismaInventoryReadModel } from './infrastructure/prisma-inventory.read-model.js';
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository.js';
import { InventoryController } from './interface/inventory.controller.js';

@Module({
  imports: [StoresModule, MediaModule],
  controllers: [InventoryController],
  providers: [
    { provide: InventoryRepository, useClass: PrismaInventoryRepository },
    { provide: InventoryReadModel, useClass: PrismaInventoryReadModel },
    InventoryService,
    InventoryFacade,
  ],
  exports: [InventoryFacade],
})
export class InventoryModule {}
