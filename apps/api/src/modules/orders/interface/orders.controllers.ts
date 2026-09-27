import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type CancelOrderInput,
  cancelOrderSchema,
  type CreateDraftOrderInput,
  createDraftOrderSchema,
  type CustomerDetailDto,
  type CustomerDto,
  type CustomerListQuery,
  customerListQuerySchema,
  type OrderDto,
  type OrderListItemDto,
  type OrderListQuery,
  orderListQuerySchema,
  type Paginated,
  type UpdateDraftOrderInput,
  updateDraftOrderSchema,
} from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { ADMIN_API, Roles } from '../../../shared/infrastructure/http/access.decorators.js';
import { Idempotent } from '../../../shared/infrastructure/http/idempotency.interceptor.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import {
  CreateDraftOrderUseCase,
  OrderDtoLoader,
  OrderLifecycleUseCases,
  PlaceOrderUseCase,
  UpdateDraftOrderUseCase,
} from '../application/order.use-cases.js';
import { OrdersReadModel } from '../application/orders.ports.js';

@ApiTags('commandes')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/orders`)
export class OrdersController {
  constructor(
    private readonly readModel: OrdersReadModel,
    private readonly dtos: OrderDtoLoader,
    private readonly createDraft: CreateDraftOrderUseCase,
    private readonly updateDraft: UpdateDraftOrderUseCase,
    private readonly placeOrder: PlaceOrderUseCase,
    private readonly lifecycle: OrderLifecycleUseCases,
  ) {}

  /** UC-35 : filtres statut, paiement, période, client, recherche (numéro, e-mail, nom). */
  @Get()
  list(@ZodQuery(orderListQuerySchema) query: OrderListQuery): Promise<Paginated<OrderListItemDto>> {
    return this.readModel.listOrders(query);
  }

  /** UC-30 : brouillon créé depuis le back-office. */
  @Post()
  @ApiZodBody(createDraftOrderSchema)
  create(@ZodBody(createDraftOrderSchema) input: CreateDraftOrderInput): Promise<OrderDto> {
    return this.createDraft.execute(input);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<OrderDto> {
    return this.dtos.load(id);
  }

  @Patch(':id')
  @ApiZodBody(updateDraftOrderSchema)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateDraftOrderSchema) input: UpdateDraftOrderInput,
  ): Promise<OrderDto> {
    return this.updateDraft.execute(id, input);
  }

  /** UC-31 : passe le brouillon (réserve le stock). Idempotent : un double clic ne passe qu'une commande. */
  @Post(':id/place')
  @HttpCode(200)
  @Idempotent()
  place(@Param('id', ParseUUIDPipe) id: string): Promise<OrderDto> {
    return this.placeOrder.execute(id);
  }

  /** UC-32 */
  @Post(':id/mark-paid')
  @HttpCode(200)
  @Roles('ADMIN')
  markPaid(@Param('id', ParseUUIDPipe) id: string): Promise<OrderDto> {
    return this.lifecycle.markPaid(id);
  }

  /** UC-33 : expédition (consomme le stock réservé). */
  @Post(':id/fulfill')
  @HttpCode(200)
  fulfill(@Param('id', ParseUUIDPipe) id: string): Promise<OrderDto> {
    return this.lifecycle.fulfill(id);
  }

  /** UC-34 : annulation (libère le stock d'une commande passée). */
  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiZodBody(cancelOrderSchema)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(cancelOrderSchema) input: CancelOrderInput,
  ): Promise<OrderDto> {
    return this.lifecycle.cancel(id, input.reason);
  }
}

@ApiTags('clients')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/customers`)
export class CustomersController {
  constructor(private readonly readModel: OrdersReadModel) {}

  /** UC-36 */
  @Get()
  list(@ZodQuery(customerListQuerySchema) query: CustomerListQuery): Promise<Paginated<CustomerDto>> {
    return this.readModel.listCustomers(query);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerDetailDto> {
    const customer = await this.readModel.getCustomer(id);
    if (!customer) throw new NotFoundError('Client', id);
    return customer;
  }
}
