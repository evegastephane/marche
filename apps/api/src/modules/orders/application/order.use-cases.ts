import { Injectable } from '@nestjs/common';
import type {
  CheckoutResultDto,
  CreateDraftOrderInput,
  CustomerInput,
  CustomOrderLineInput,
  OrderDto,
  OrderLineInput,
  UpdateDraftOrderInput,
} from '@marche/contracts';
import type { Address } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { ConcurrentModificationError, NotFoundError } from '../../../shared/domain/domain-error.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { Order } from '../domain/order.aggregate.js';
import { CustomerRepository, OrderRepository } from '../domain/order.repositories.js';
import { OrderPlacementService } from './order-placement.service.js';
import { OrdersReadModel } from './orders.ports.js';

/** Lignes du catalogue du brouillon (variante + quantité), à refiger au prix du moment. */
function lineRequests(order: Order): OrderLineInput[] {
  return order.lines.flatMap((line) =>
    !line.custom && line.variantId ? [{ variantId: line.variantId, quantity: line.quantity }] : [],
  );
}

/** Lignes libres du brouillon : elles gardent le prix convenu. */
function customLineRequests(order: Order): CustomOrderLineInput[] {
  return order.lines.flatMap((line) =>
    line.custom
      ? [{ title: line.productTitle, variantTitle: line.variantTitle, unitPriceAmount: line.unitPriceAmount, quantity: line.quantity }]
      : [],
  );
}

@Injectable()
export class OrderDtoLoader {
  constructor(private readonly readModel: OrdersReadModel) {}

  async load(orderId: string): Promise<OrderDto> {
    const dto = await this.readModel.getOrder(orderId);
    if (!dto) throw new NotFoundError('Commande', orderId);
    return dto;
  }
}

/** UC-30 : commande manuelle (brouillon) créée depuis le back-office. */
@Injectable()
export class CreateDraftOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerRepository,
    private readonly placement: OrderPlacementService,
    private readonly stores: StoresFacade,
    private readonly uow: UnitOfWork,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
    private readonly dtos: OrderDtoLoader,
  ) {}

  async execute(input: CreateDraftOrderInput): Promise<OrderDto> {
    const storeId = this.actor.storeId;
    const settings = await this.stores.getSettings(storeId);
    const orderId = await this.uow.run(async () => {
      const now = this.clock.now();
      const order = Order.createDraft(
        {
          storeId,
          currency: settings.currency,
          source: 'ADMIN',
          email: input.customer?.email ?? null,
          shippingAddress: input.shippingAddress ?? null,
          note: input.note ?? null,
        },
        now,
      );
      if (input.customer) {
        const customerId = await this.upsertCustomer(input.customer, input.shippingAddress ?? null);
        order.updateDetails({ customerId }, now);
      }
      if (input.lines.length > 0 || input.customLines.length > 0) {
        order.replaceLines(
          await this.placement.priceLines({ lines: input.lines, customLines: input.customLines }, false),
          await this.placement.shippingStrategy(),
          now,
        );
      }
      await this.orders.insert(order);
      return order.id;
    });
    return this.dtos.load(orderId);
  }

  private upsertCustomer(customer: CustomerInput, address: Address | null): Promise<string> {
    return this.customers.upsertByEmail({
      email: customer.email,
      firstName: customer.firstName ?? address?.firstName ?? null,
      lastName: customer.lastName ?? address?.lastName ?? null,
      phone: customer.phone ?? address?.phone ?? null,
      defaultAddress: address,
    });
  }
}

@Injectable()
export class UpdateDraftOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerRepository,
    private readonly placement: OrderPlacementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly dtos: OrderDtoLoader,
  ) {}

  async execute(orderId: string, input: UpdateDraftOrderInput): Promise<OrderDto> {
    await this.uow.run(async () => {
      const order = await this.orders.findById(orderId);
      if (!order) throw new NotFoundError('Commande', orderId);
      if (order.version !== input.version) throw new ConcurrentModificationError('La commande');
      const now = this.clock.now();
      if (input.customer !== undefined) {
        const customerId = input.customer
          ? await this.customers.upsertByEmail({
              email: input.customer.email,
              firstName: input.customer.firstName ?? null,
              lastName: input.customer.lastName ?? null,
              phone: input.customer.phone ?? null,
            })
          : null;
        order.updateDetails({ customerId, email: input.customer?.email ?? null }, now);
      }
      if (input.shippingAddress !== undefined || input.note !== undefined) {
        order.updateDetails({ shippingAddress: input.shippingAddress, note: input.note }, now);
      }
      if (input.lines || input.customLines) {
        const request = {
          lines: input.lines ?? lineRequests(order),
          customLines: input.customLines ?? customLineRequests(order),
        };
        order.replaceLines(
          await this.placement.priceLines(request, false),
          await this.placement.shippingStrategy(),
          now,
        );
      }
      await this.orders.update(order);
    });
    return this.dtos.load(orderId);
  }
}

/** UC-31 (back-office) : passer un brouillon. */
@Injectable()
export class PlaceOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly placement: OrderPlacementService,
    private readonly dtos: OrderDtoLoader,
  ) {}

  async execute(orderId: string): Promise<OrderDto> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Commande', orderId);
    await this.placement.place(order, {
      request: { lines: lineRequests(order), customLines: customLineRequests(order) },
      requireSellable: false,
      isNew: false,
    });
    return this.dtos.load(orderId);
  }
}

/** UC-32, UC-33, UC-34 : paiement, expédition (consomme le stock), annulation (libère le stock). */
@Injectable()
export class OrderLifecycleUseCases {
  constructor(
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryFacade,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
    private readonly dtos: OrderDtoLoader,
  ) {}

  markPaid(orderId: string): Promise<OrderDto> {
    return this.mutate(orderId, (order) => {
      order.markPaid(this.clock.now());
    });
  }

  fulfill(orderId: string): Promise<OrderDto> {
    return this.mutate(orderId, async (order) => {
      order.fulfill(this.clock.now());
      await this.inventory.commit(order.reservedLines(), order.id);
    });
  }

  cancel(orderId: string, reason: string): Promise<OrderDto> {
    return this.mutate(orderId, async (order) => {
      const previous = order.cancel(reason, this.clock.now());
      if (previous === 'PLACED') await this.inventory.release(order.reservedLines());
    });
  }

  private async mutate(orderId: string, change: (order: Order) => void | Promise<void>): Promise<OrderDto> {
    await this.uow.run(async () => {
      const order = await this.orders.findById(orderId);
      if (!order) throw new NotFoundError('Commande', orderId);
      await change(order);
      await this.orders.update(order);
      await this.outbox.addAll(order.pullEvents());
    });
    return this.dtos.load(orderId);
  }
}

/** UC-45 : commande passée depuis le site (checkout invité). */
@Injectable()
export class PlaceStorefrontOrderUseCase {
  constructor(
    private readonly placement: OrderPlacementService,
    private readonly stores: StoresFacade,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    lines: readonly OrderLineInput[];
    email: string;
    phone?: string;
    shippingAddress: Address;
    note?: string;
    whatsappOptIn?: boolean;
  }): Promise<CheckoutResultDto> {
    const settings = await this.stores.getSettings(this.actor.storeId);
    const order = Order.createDraft(
      {
        storeId: this.actor.storeId,
        currency: settings.currency,
        source: 'STOREFRONT',
        email: input.email,
        shippingAddress: { ...input.shippingAddress, phone: input.phone ?? input.shippingAddress.phone },
        note: input.note ?? null,
      },
      this.clock.now(),
    );
    await this.placement.place(order, {
      request: { lines: input.lines },
      requireSellable: true,
      customer: { phone: input.phone ?? input.shippingAddress.phone ?? null, whatsappOptIn: input.whatsappOptIn },
      isNew: true,
    });
    const placed = order.snapshot();
    return {
      orderNumber: placed.number ?? 0,
      publicToken: placed.publicToken,
      totalAmount: placed.totalAmount,
      currency: placed.currency,
    };
  }
}
