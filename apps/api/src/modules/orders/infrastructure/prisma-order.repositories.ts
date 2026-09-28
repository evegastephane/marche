import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { type Address, addressSchema, type Currency, type OrderDiscount } from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { ConcurrentModificationError } from '../../../shared/domain/domain-error.js';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { lineTotal, Order } from '../domain/order.aggregate.js';
import {
  type CustomerDetails,
  CustomerRepository,
  OrderRepository,
  type WhatsAppRecipient,
} from '../domain/order.repositories.js';

export function parseAddress(value: Prisma.JsonValue | null): Address | null {
  if (value === null) return null;
  const parsed = addressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Remises figées sur la commande (JSON) ; une entrée illisible est ignorée. */
export function parseDiscounts(value: Prisma.JsonValue): OrderDiscount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return [];
    const { bundleId, title, amount } = item as Record<string, unknown>;
    if (typeof title !== 'string' || typeof amount !== 'number') return [];
    return [{ bundleId: typeof bundleId === 'string' ? bundleId : null, title, amount }];
  });
}

const orderInclude = { lines: { orderBy: { position: 'asc' } } } satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toDomain(row: OrderRow): Order {
  return Order.reconstitute(
    row.id,
    {
      storeId: row.storeId,
      number: row.number,
      publicToken: row.publicToken,
      customerId: row.customerId,
      email: row.email,
      status: row.status,
      paymentStatus: row.paymentStatus,
      source: row.source,
      currency: row.currency as Currency,
      lines: row.lines.map((line) => ({
        id: line.id,
        variantId: line.variantId,
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        sku: line.sku,
        unitPriceAmount: line.unitPriceAmount,
        quantity: line.quantity,
        tracksInventory: line.tracksInventory,
        custom: line.custom,
      })),
      subtotalAmount: row.subtotalAmount,
      discounts: parseDiscounts(row.discounts),
      discountAmount: row.discountAmount,
      shippingAmount: row.shippingAmount,
      totalAmount: row.totalAmount,
      shippingAddress: parseAddress(row.shippingAddress),
      shippingMethod: row.shippingMethod,
      note: row.note,
      cancelReason: row.cancelReason,
      placedAt: row.placedAt,
      paidAt: row.paidAt,
      fulfilledAt: row.fulfilledAt,
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    row.version,
  );
}

function orderFields(order: Order) {
  const o = order.snapshot();
  return {
    number: o.number,
    customerId: o.customerId,
    email: o.email,
    status: o.status,
    paymentStatus: o.paymentStatus,
    subtotalAmount: o.subtotalAmount,
    discounts: o.discounts as unknown as Prisma.InputJsonValue,
    discountAmount: o.discountAmount,
    shippingAmount: o.shippingAmount,
    totalAmount: o.totalAmount,
    shippingAddress: (o.shippingAddress ?? undefined) as Prisma.InputJsonValue | undefined,
    shippingMethod: o.shippingMethod,
    note: o.note,
    cancelReason: o.cancelReason,
    placedAt: o.placedAt,
    paidAt: o.paidAt,
    fulfilledAt: o.fulfilledAt,
    cancelledAt: o.cancelledAt,
  };
}

@Injectable()
export class PrismaOrderRepository extends OrderRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.txHost.tx.order.findUnique({ where: { id }, include: orderInclude });
    return row ? toDomain(row) : null;
  }

  async insert(order: Order): Promise<void> {
    const o = order.snapshot();
    await this.txHost.tx.order.create({
      data: {
        id: order.id,
        storeId: o.storeId,
        publicToken: o.publicToken,
        source: o.source,
        currency: o.currency,
        createdAt: o.createdAt,
        ...orderFields(order),
      },
    });
    await this.writeLines(order);
  }

  async update(order: Order): Promise<void> {
    const { count } = await this.txHost.tx.order.updateMany({
      where: { id: order.id, version: order.version },
      data: { ...orderFields(order), version: { increment: 1 } },
    });
    if (count === 0) throw new ConcurrentModificationError('La commande');
    await this.txHost.tx.orderLine.deleteMany({ where: { orderId: order.id } });
    await this.writeLines(order);
    order.markPersisted();
  }

  private async writeLines(order: Order): Promise<void> {
    if (order.lines.length === 0) return;
    await this.txHost.tx.orderLine.createMany({
      data: order.lines.map((line, position) => ({
        id: line.id,
        storeId: this.actor.storeId,
        orderId: order.id,
        variantId: line.variantId,
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        sku: line.sku,
        unitPriceAmount: line.unitPriceAmount,
        quantity: line.quantity,
        lineTotalAmount: lineTotal(line),
        tracksInventory: line.tracksInventory,
        custom: line.custom,
        position,
      })),
    });
  }
}

@Injectable()
export class PrismaCustomerRepository extends CustomerRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async upsertByEmail(details: CustomerDetails): Promise<string> {
    const storeId = this.actor.storeId;
    const email = details.email.trim().toLowerCase();
    // On complète le client sans effacer ce qu'on connaît déjà.
    const update = {
      ...(details.firstName ? { firstName: details.firstName } : {}),
      ...(details.lastName ? { lastName: details.lastName } : {}),
      ...(details.phone ? { phone: details.phone } : {}),
      ...(details.defaultAddress ? { defaultAddress: details.defaultAddress as Prisma.InputJsonValue } : {}),
      ...(details.whatsappOptIn ? { whatsappOptInAt: new Date(), whatsappOptOutAt: null } : {}),
    };
    try {
      const row = await this.txHost.tx.customer.upsert({
        where: { storeId_email: { storeId, email } },
        create: { storeId, email, ...update },
        update,
        select: { id: true },
      });
      return row.id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.txHost.tx.customer.findFirst({ where: { email }, select: { id: true } });
      if (!existing) throw error;
      return existing.id;
    }
  }

  async listWhatsAppRecipients(): Promise<WhatsAppRecipient[]> {
    const rows = await this.txHost.tx.customer.findMany({
      where: { whatsappOptInAt: { not: null }, whatsappOptOutAt: null, phone: { not: null } },
      select: { id: true, firstName: true, phone: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.flatMap((row) => (row.phone?.trim() ? [{ customerId: row.id, firstName: row.firstName, phone: row.phone }] : []));
  }

  async optOutWhatsApp(phoneSuffix: string, at: Date): Promise<number> {
    // SQL brut (hors isolation par boutique, voulu ici) : les numéros sont saisis librement, on compare les chiffres.
    return this.txHost.tx.$executeRaw`
      UPDATE customers SET whatsapp_opt_out_at = ${at}, updated_at = now()
      WHERE whatsapp_opt_out_at IS NULL AND phone IS NOT NULL
        AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || ${phoneSuffix}`;
  }
}
