import { Module } from '@nestjs/common';
import { DeviceUseCases } from './application/device.use-cases.js';
import { DeviceCatalog, DeviceSpecsProvider } from './application/devices.ports.js';
import { MobileApiProvider, PrismaDeviceCatalog } from './infrastructure/devices.adapters.js';
import { DevicesController } from './interface/devices.controller.js';

/** Catalogue d'appareils partagé (fiches techniques préremplies), hors boutique. */
@Module({
  controllers: [DevicesController],
  providers: [
    { provide: DeviceCatalog, useClass: PrismaDeviceCatalog },
    { provide: DeviceSpecsProvider, useClass: MobileApiProvider },
    DeviceUseCases,
  ],
})
export class DevicesModule {}
