import { Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AdjustStockInput,
  adjustStockSchema,
  type InventoryItemDto,
  type InventoryLevelDto,
  type InventoryListQuery,
  inventoryListQuerySchema,
  type Paginated,
  type PaginationQuery,
  paginationQuerySchema,
  type SetLowStockThresholdInput,
  setLowStockThresholdSchema,
  type StockMovementDto,
} from '@marche/contracts';
import { ADMIN_API } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { InventoryService } from '../application/inventory.service.js';

@ApiTags('stock')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/inventory`)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Liste du stock, les situations les plus urgentes en premier (filtres : low, out, q). */
  @Get()
  list(@ZodQuery(inventoryListQuerySchema) query: InventoryListQuery): Promise<Paginated<InventoryItemDto>> {
    return this.inventory.list(query);
  }

  /** UC-20 : réception, correction, perte, retour. */
  @Post(':variantId/adjustments')
  @ApiZodBody(adjustStockSchema)
  adjust(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @ZodBody(adjustStockSchema) input: AdjustStockInput,
  ): Promise<InventoryLevelDto> {
    return this.inventory.adjust(variantId, input);
  }

  @Put(':variantId/threshold')
  @ApiZodBody(setLowStockThresholdSchema)
  setThreshold(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @ZodBody(setLowStockThresholdSchema) input: SetLowStockThresholdInput,
  ): Promise<InventoryLevelDto> {
    return this.inventory.setThreshold(variantId, input.lowStockThreshold);
  }

  /** UC-21 : historique des mouvements d'une variante. */
  @Get(':variantId/movements')
  movements(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @ZodQuery(paginationQuerySchema) query: PaginationQuery,
  ): Promise<Paginated<StockMovementDto>> {
    return this.inventory.movements(variantId, query.cursor, query.limit);
  }
}
