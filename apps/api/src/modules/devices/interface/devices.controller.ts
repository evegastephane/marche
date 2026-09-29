import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type DeviceModelDto,
  type DeviceSearchDto,
  type DeviceSearchQuery,
  deviceSearchQuerySchema,
  type ImportDeviceInput,
  importDeviceSchema,
} from '@marche/contracts';
import { ADMIN_API } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { DeviceUseCases } from '../application/device.use-cases.js';

/** Catalogue d'appareils : chercher un modèle et en importer la fiche pour préremplir un produit. */
@ApiTags('devices')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/devices`)
export class DevicesController {
  constructor(private readonly devices: DeviceUseCases) {}

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  search(@ZodQuery(deviceSearchQuerySchema) query: DeviceSearchQuery): Promise<DeviceSearchDto> {
    return this.devices.search(query.q);
  }

  @Post('import')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiZodBody(importDeviceSchema)
  import(@ZodBody(importDeviceSchema) input: ImportDeviceInput): Promise<DeviceModelDto> {
    return this.devices.get(input.ref);
  }
}
