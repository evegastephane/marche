import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  type StockCountInput,
  stockCountSchema,
  type StockMovementDto,
  type ReceiveUnitsInput,
  receiveUnitsSchema,
  type StockUnitDto,
  type UnitListQuery,
  unitListQuerySchema,
  type UnitMovementInput,
  unitMovementSchema,
  type UpdateUnitInput,
  updateUnitSchema,
} from '@marche/contracts';
import { ADMIN_API, ApiScope } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { InventoryService } from '../application/inventory.service.js';

@ApiTags('stock')
@ApiBearerAuth()
@ApiScope('inventory')
@Controller(`${ADMIN_API}/inventory`)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Liste du stock, les situations les plus urgentes en premier (filtres : low, out, q). */
  @Get()
  list(@ZodQuery(inventoryListQuerySchema) query: InventoryListQuery): Promise<Paginated<InventoryItemDto>> {
    return this.inventory.list(query);
  }

  /** Comptage de plusieurs déclinaisons (grille taille × couleur). */
  @Post('counts')
  @HttpCode(200)
  @ApiZodBody(stockCountSchema)
  count(@ZodBody(stockCountSchema) input: StockCountInput): Promise<InventoryLevelDto[]> {
    return this.inventory.count(input);
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

  // ───────────── Unités suivies (IMEI, numéros de série) ─────────────

  @Get(':variantId/units')
  @ApiOperation({ summary: 'Unités (IMEI, numéros de série) d’une variante suivie à l’unité' })
  units(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @ZodQuery(unitListQuerySchema) query: UnitListQuery,
  ): Promise<Paginated<StockUnitDto>> {
    return this.inventory.units(variantId, query);
  }

  @Post(':variantId/units')
  @ApiOperation({ summary: 'Réception d’unités : une par IMEI, chacune enregistrée comme un mouvement +1' })
  @ApiZodBody(receiveUnitsSchema)
  receiveUnits(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @ZodBody(receiveUnitsSchema) input: ReceiveUnitsInput,
  ): Promise<InventoryLevelDto> {
    return this.inventory.receiveUnits(variantId, input);
  }

  @Patch('units/:unitId')
  @ApiOperation({ summary: 'Correction d’une unité (IMEI tant qu’elle est en stock, batterie, notes)' })
  @ApiZodBody(updateUnitSchema)
  updateUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @ZodBody(updateUnitSchema) input: UpdateUnitInput,
  ): Promise<StockUnitDto> {
    return this.inventory.updateUnit(unitId, input);
  }

  @Post('units/:unitId/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sortie d’une unité en stock (perte, vol, défaut) : mouvement −1' })
  @ApiZodBody(unitMovementSchema)
  removeUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @ZodBody(unitMovementSchema) input: UnitMovementInput,
  ): Promise<StockUnitDto> {
    return this.inventory.removeUnit(unitId, input);
  }

  @Post('units/:unitId/return')
  @HttpCode(200)
  @ApiOperation({ summary: 'Retour en stock d’une unité vendue ou sortie : mouvement +1' })
  @ApiZodBody(unitMovementSchema)
  returnUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @ZodBody(unitMovementSchema) input: UnitMovementInput,
  ): Promise<StockUnitDto> {
    return this.inventory.returnUnit(unitId, input);
  }
}
