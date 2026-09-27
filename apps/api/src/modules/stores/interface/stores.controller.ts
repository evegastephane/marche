import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type CreateStoreInput,
  createStoreSchema,
  type StoreDto,
  type UpdateStoreInput,
  updateStoreSchema,
} from '@marche/contracts';
import {
  ADMIN_API,
  NoStoreRequired,
  Roles,
} from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodValidationPipe } from '../../../shared/infrastructure/http/zod-validation.js';
import { CreateStoreUseCase } from '../application/create-store.use-case.js';
import {
  GetCurrentStoreQuery,
  UpdateCurrentStoreUseCase,
} from '../application/current-store.use-cases.js';

@ApiTags('boutiques')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/stores`)
export class StoresController {
  constructor(
    private readonly createStore: CreateStoreUseCase,
    private readonly getCurrentStore: GetCurrentStoreQuery,
    private readonly updateCurrentStore: UpdateCurrentStoreUseCase,
  ) {}

  /** UC-02 : crée la boutique et son organisation Clerk. */
  @Post()
  @NoStoreRequired()
  @ApiZodBody(createStoreSchema)
  create(@Body(new ZodValidationPipe(createStoreSchema)) input: CreateStoreInput): Promise<StoreDto> {
    return this.createStore.execute(input);
  }

  @Get('current')
  current(): Promise<StoreDto> {
    return this.getCurrentStore.execute();
  }

  /** UC-03 : paramètres de la boutique. */
  @Patch('current')
  @Roles('ADMIN')
  @ApiZodBody(updateStoreSchema)
  update(@Body(new ZodValidationPipe(updateStoreSchema)) input: UpdateStoreInput): Promise<StoreDto> {
    return this.updateCurrentStore.execute(input);
  }
}
