import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type {
  Currency,
  CustomerDetailDto,
  CustomerDto,
  CustomerListQuery,
  OrderDto,
  OrderListItemDto,
  OrderListQuery,
  Paginated,
  PublicOrderDto,
} from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { decodeCursor, toPage } from '../../../shared/application/pagination.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { type OrderSummary, OrdersReadModel } from '../application/orders.ports.js';
import { parseAddress, parseDiscounts } from './prisma-order.repositories.js';

const listInclude = {
  lines: { select: { quantity: true } },
  customer: { select: { firstName: true, lastName: true } },
} satisfies Prisma.OrderInclude;
type ListRow = Prisma.OrderGetPayload<{ include: typeof listInclude }>;

const detailInclude = {
  lines: { orderBy: { position: 'asc' } },
  customer: true,
} satisfies Prisma.OrderInclude;
type DetailRow = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

function fullName(first: string | null | undefined, last: string | null | undefined): string | null {
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || null;
}

function customerNameOf(row: ListRow | DetailRow): string | null {
  const address = parseAddress(row.shippingAddress);
  return fullName(row.customer?.firstName, row.customer?.lastName) ?? fullName(address?.firstName, address?.lastName);
}

function toListItem(row: ListRow): OrderListItemDto {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    paymentStatus: row.paymentStatus,
    source: row.source,
    email: row.email,
    customerName: customerNameOf(row),
    itemsCount: row.lines.reduce((sum, line) => sum + line.quantity, 0),
    totalAmount: row.totalAmount,
    currency: row.currency as Currency,
    createdAt: row.createdAt.toISOString(),
    placedAt: row.placedAt?.toISOString() ?? null,
  };
}

/** Commandes comptées dans les statistiques client (hors brouillons et annulations). */
const COUNTED_STATUSES = ['PLACED', 'FULFILLED'] as const;

@Injectable()
export class PrismaOrdersReadModel extends OrdersReadModel {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async listOrders(query: OrderListQuery): Promise<Paginated<OrderListItemDto>> {
    const and: Prisma.OrderWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.paymentStatus) and.push({ paymentStatus: query.paymentStatus });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.from) and.push({ createdAt: { gte: new Date(`${query.from}T00:00:00.000Z`) } });
    if (query.to) and.push({ createdAt: { lt: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86_400_000) } });
    if (query.q) {
      const number = Number(query.q.replace(/^#/, ''));
      and.push({
        OR: [
          ...(Number.isInteger(number) && number > 0 ? [{ number }] : []),
          { email: { contains: query.q, mode: 'insensitive' } },
          { customer: { lastName: { contains: query.q, mode: 'insensitive' } } },
        ],
      });
    }
    if (query.cursor) {
      const [createdAt, id] = decodeCursor(query.cursor, 2);
      const date = new Date(String(createdAt));
      and.push({ OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: String(id) } }] });
    }
    const rows = await this.txHost.tx.order.findMany({
      where: { AND: and },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: listInclude,
    });
    const page = toPage(rows, query.limit, (row) => [row.createdAt.toISOString(), row.id]);
    return { items: page.items.map(toListItem), nextCursor: page.nextCursor };
  }

  async getOrder(id: string): Promise<OrderDto | null> {
    const row = await this.txHost.tx.order.findUnique({ where: { id }, include: detailInclude });
    return row ? this.toOrderDto(row) : null;
  }

  async listCustomers(query: CustomerListQuery): Promise<Paginated<CustomerDto>> {
    const and: Prisma.CustomerWhereInput[] = [];
    if (query.q) {
      and.push({
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { lastName: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }
    if (query.cursor) {
      const [createdAt, id] = decodeCursor(query.cursor, 2);
      const date = new Date(String(createdAt));
      and.push({ OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: String(id) } }] });
    }
    const rows = await this.txHost.tx.customer.findMany({
      where: { AND: and },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = toPage(rows, query.limit, (row) => [row.createdAt.toISOString(), row.id]);
    const stats = await this.customerStats(page.items.map((row) => row.id));
    return { items: page.items.map((row) => this.toCustomerDto(row, stats)), nextCursor: page.nextCursor };
  }

  async getCustomer(id: string): Promise<CustomerDetailDto | null> {
    const row = await this.txHost.tx.customer.findUnique({ where: { id } });
    if (!row) return null;
    const [stats, orders] = await Promise.all([
      this.customerStats([id]),
      this.txHost.tx.order.findMany({
        where: { customerId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        include: listInclude,
      }),
    ]);
    return { ...this.toCustomerDto(row, stats), orders: orders.map(toListItem) };
  }

  async getPublicOrder(publicToken: string): Promise<PublicOrderDto | null> {
    const row = await this.txHost.tx.order.findUnique({ where: { publicToken }, include: detailInclude });
    if (!row || row.status === 'DRAFT') return null;
    const address = parseAddress(row.shippingAddress);
    return {
      number: row.number,
      status: row.status,
      paymentStatus: row.paymentStatus,
      currency: row.currency as Currency,
      lines: row.lines.map((line) => ({
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        quantity: line.quantity,
        unitPriceAmount: line.unitPriceAmount,
        lineTotalAmount: line.lineTotalAmount,
      })),
      subtotalAmount: row.subtotalAmount,
      discountAmount: row.discountAmount,
      shippingAmount: row.shippingAmount,
      totalAmount: row.totalAmount,
      placedAt: row.placedAt?.toISOString() ?? null,
      shippingCity: address?.city ?? null,
      shippingCountry: address?.country ?? null,
    };
  }

  async getSummary(orderId: string): Promise<OrderSummary | null> {
    const row = await this.txHost.tx.order.findUnique({ where: { id: orderId }, include: detailInclude });
    if (!row) return null;
    return {
      id: row.id,
      number: row.number,
      status: row.status,
      email: row.email,
      customerName: customerNameOf(row),
      currency: row.currency as Currency,
      lines: row.lines.map((line) => ({
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        quantity: line.quantity,
        unitPriceAmount: line.unitPriceAmount,
        lineTotalAmount: line.lineTotalAmount,
      })),
      subtotalAmount: row.subtotalAmount,
      discounts: parseDiscounts(row.discounts),
      discountAmount: row.discountAmount,
      shippingAmount: row.shippingAmount,
      totalAmount: row.totalAmount,
      shippingAddress: parseAddress(row.shippingAddress),
      publicToken: row.publicToken,
      placedAt: row.placedAt?.toISOString() ?? null,
    };
  }

  private toOrderDto(row: DetailRow): OrderDto {
    return {
      id: row.id,
      number: row.number,
      status: row.status,
      paymentStatus: row.paymentStatus,
      source: row.source,
      currency: row.currency as Currency,
      email: row.email,
      customer: row.customer
        ? {
            id: row.customer.id,
            email: row.customer.email,
            firstName: row.customer.firstName,
            lastName: row.customer.lastName,
            phone: row.customer.phone,
          }
        : null,
      lines: row.lines.map((line) => ({
        id: line.id,
        variantId: line.variantId,
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        sku: line.sku,
        unitPriceAmount: line.unitPriceAmount,
        quantity: line.quantity,
        lineTotalAmount: line.lineTotalAmount,
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
      publicToken: row.publicToken,
      placedAt: row.placedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
    };
  }

  private async customerStats(customerIds: string[]) {
    if (customerIds.length === 0) return new Map<string, { count: number; total: number; last: Date | null }>();
    const groups = await this.txHost.tx.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, status: { in: [...COUNTED_STATUSES] } },
      _count: { _all: true },
      _sum: { totalAmount: true },
      _max: { placedAt: true },
    });
    return new Map(
      groups.flatMap((group) =>
        group.customerId
          ? [
              [
                group.customerId,
                {
                  count: group._count._all,
                  total: group._sum.totalAmount ?? 0,
                  last: group._max.placedAt,
                },
              ] as const,
            ]
          : [],
      ),
    );
  }

  private toCustomerDto(
    row: Prisma.CustomerGetPayload<object>,
    stats: Map<string, { count: number; total: number; last: Date | null }>,
  ): CustomerDto {
    const stat = stats.get(row.id);
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      defaultAddress: parseAddress(row.defaultAddress),
      ordersCount: stat?.count ?? 0,
      totalSpentAmount: stat?.total ?? 0,
      lastOrderAt: stat?.last?.toISOString() ?? null,
      whatsappOptInAt: row.whatsappOptInAt?.toISOString() ?? null,
      whatsappOptOutAt: row.whatsappOptOutAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
