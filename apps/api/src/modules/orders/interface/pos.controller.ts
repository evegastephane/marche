import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CashMovementInput,
  cashMovementSchema,
  type ClosePosSessionInput,
  closePosSessionSchema,
  type OpenPosSessionInput,
  openPosSessionSchema,
  type Paginated,
  type PosCreditDto,
  type PosLookupDto,
  type PosLookupQuery,
  posLookupQuerySchema,
  type PosQuoteDto,
  type PosQuoteInput,
  posQuoteSchema,
  type PosReturnInput,
  type PosReturnResultDto,
  posReturnSchema,
  type PosSaleDto,
  type PosSaleInput,
  type PosSaleListQuery,
  posSaleListQuerySchema,
  posSaleSchema,
  type PosSaleSummaryDto,
  type PosSessionDetailDto,
  type PosSessionDto,
  type PosSessionListQuery,
  posSessionListQuerySchema,
  type PosSettings,
  type PosVariantDto,
  type PosVariantSearchQuery,
  posVariantSearchQuerySchema,
  type UpdatePosSettingsInput,
  updatePosSettingsSchema,
} from '@marche/contracts';
import { ADMIN_API, Roles } from '../../../shared/infrastructure/http/access.decorators.js';
import { Idempotent } from '../../../shared/infrastructure/http/idempotency.interceptor.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import {
  PosCatalogQueries,
  PosReturnUseCase,
  PosSalesQueries,
  PosSaleUseCase,
  PosSessionUseCases,
  PosSettingsUseCases,
} from '../application/pos.use-cases.js';

/**
 * Caisse (point de vente). Réservée aux comptes de la boutique : aucune route n'est ouverte
 * aux clés d'API (pas de @ApiScope). Le vendeur encaisse dans sa propre caisse.
 */
@ApiTags('caisse')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/pos`)
export class PosController {
  constructor(
    private readonly settings: PosSettingsUseCases,
    private readonly sessions: PosSessionUseCases,
    private readonly catalog: PosCatalogQueries,
    private readonly sale: PosSaleUseCase,
    private readonly returns: PosReturnUseCase,
    private readonly sales: PosSalesQueries,
  ) {}

  @Get('settings')
  getSettings(): Promise<PosSettings> {
    return this.settings.get();
  }

  @Put('settings')
  @Roles('ADMIN')
  @ApiZodBody(updatePosSettingsSchema)
  updateSettings(@ZodBody(updatePosSettingsSchema) input: UpdatePosSettingsInput): Promise<PosSettings> {
    return this.settings.update(input);
  }

  @Get('session')
  @ApiOperation({ summary: 'Caisse ouverte du vendeur connecté (null si aucune)' })
  async currentSession(): Promise<{ session: PosSessionDto | null }> {
    return { session: await this.sessions.current() };
  }

  @Post('sessions')
  @ApiZodBody(openPosSessionSchema)
  openSession(@ZodBody(openPosSessionSchema) input: OpenPosSessionInput): Promise<PosSessionDto> {
    return this.sessions.open(input);
  }

  @Get('sessions')
  listSessions(@ZodQuery(posSessionListQuerySchema) query: PosSessionListQuery): Promise<Paginated<PosSessionDto>> {
    return this.sessions.list(query);
  }

  @Get('sessions/:id')
  getSession(@Param('id', ParseUUIDPipe) id: string): Promise<PosSessionDetailDto> {
    return this.sessions.detail(id);
  }

  @Post('sessions/:id/close')
  @HttpCode(200)
  @ApiZodBody(closePosSessionSchema)
  closeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(closePosSessionSchema) input: ClosePosSessionInput,
  ): Promise<PosSessionDetailDto> {
    return this.sessions.close(id, input);
  }

  @Post('sessions/:id/movements')
  @ApiZodBody(cashMovementSchema)
  addMovement(@Param('id', ParseUUIDPipe) id: string, @ZodBody(cashMovementSchema) input: CashMovementInput): Promise<PosSessionDetailDto> {
    return this.sessions.addMovement(id, input);
  }

  @Get('sessions/:id/credits')
  credits(@Param('id', ParseUUIDPipe) id: string): Promise<PosCreditDto[]> {
    return this.sessions.credits(id);
  }

  @Get('variants')
  @ApiOperation({ summary: 'Articles vendables au comptoir (titre, SKU, code-barres, marque)' })
  searchVariants(@ZodQuery(posVariantSearchQuerySchema) query: PosVariantSearchQuery): Promise<Paginated<PosVariantDto>> {
    return this.catalog.search(query);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lecture au scanner : code-barres, SKU ou IMEI' })
  lookup(@ZodQuery(posLookupQuerySchema) query: PosLookupQuery): Promise<PosLookupDto> {
    return this.catalog.lookup(query.code);
  }

  @Post('quote')
  @HttpCode(200)
  @ApiZodBody(posQuoteSchema)
  @ApiOperation({ summary: 'Devis du ticket (sans écriture) : total exact avant encaissement' })
  quote(@ZodBody(posQuoteSchema) input: PosQuoteInput): Promise<PosQuoteDto> {
    return this.sale.quote(input);
  }

  @Post('sales')
  @Idempotent()
  @ApiZodBody(posSaleSchema)
  @ApiOperation({ summary: 'Encaisser une vente : passée, payée et remise au client en une fois' })
  createSale(@ZodBody(posSaleSchema) input: PosSaleInput): Promise<PosSaleDto> {
    return this.sale.execute(input);
  }

  @Get('sales')
  listSales(@ZodQuery(posSaleListQuerySchema) query: PosSaleListQuery): Promise<Paginated<PosSaleSummaryDto>> {
    return this.sales.list(query);
  }

  @Get('sales/:orderId')
  getSale(@Param('orderId', ParseUUIDPipe) orderId: string): Promise<PosSaleDto> {
    return this.sale.receipt(orderId);
  }

  @Post('sales/:orderId/returns')
  @Idempotent()
  @ApiZodBody(posReturnSchema)
  @ApiOperation({ summary: 'Retour au comptoir : remboursement ou avoir, remise en stock' })
  createReturn(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @ZodBody(posReturnSchema) input: PosReturnInput,
  ): Promise<PosReturnResultDto> {
    return this.returns.execute(orderId, input);
  }
}
