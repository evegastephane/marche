import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type {
  OrderReturnDto,
  Paginated,
  PaymentMethod,
  PosCreditDto,
  PosPersonDto,
  PosSaleListQuery,
  PosSaleSummaryDto,
  PosSessionDetailDto,
  PosSessionDto,
  PosSessionListQuery,
  PosSessionMethodTotalDto,
  PosSessionTotalsDto,
} from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { decodeCursor, toPage } from '../../../shared/application/pagination.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { PosReadModel } from '../application/pos.ports.js';
import { toReturnDto } from './prisma-orders.read-model.js';

const personSelect = { id: true, firstName: true, lastName: true, email: true } satisfies Prisma.UserSelect;
type PersonRow = Prisma.UserGetPayload<{ select: typeof personSelect }>;

const sessionInclude = {
  openedBy: { select: personSelect },
  closedBy: { select: personSelect },
} satisfies Prisma.PosSessionInclude;
type SessionRow = Prisma.PosSessionGetPayload<{ include: typeof sessionInclude }>;

const saleInclude = {
  lines: { select: { quantity: true } },
  customer: { select: { firstName: true, lastName: true, phone: true } },
  payments: { where: { kind: 'PAYMENT' }, select: { method: true } },
} satisfies Prisma.OrderInclude;
type SaleRow = Prisma.OrderGetPayload<{ include: typeof saleInclude }>;

function personName(row: PersonRow): string {
  return [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.email;
}

function toPerson(row: PersonRow): PosPersonDto {
  return { id: row.id, name: personName(row) };
}

function toSaleSummary(row: SaleRow): PosSaleSummaryDto {
  const name = [row.customer?.firstName, row.customer?.lastName].filter(Boolean).join(' ').trim();
  return {
    orderId: row.id,
    number: row.number,
    totalAmount: row.totalAmount,
    refundedAmount: row.refundedAmount,
    itemsCount: row.lines.reduce((sum, line) => sum + line.quantity, 0),
    customerName: name || row.customer?.phone || row.email || null,
    methods: [...new Set(row.payments.map((payment) => payment.method))],
    placedAt: row.placedAt?.toISOString() ?? null,
  };
}

/** Ordre d'affichage des moyens de paiement dans le récapitulatif. */
const METHOD_ORDER: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'CARD', 'BANK_TRANSFER', 'EXCHANGE', 'OTHER'];

@Injectable()
export class PrismaPosReadModel extends PosReadModel {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async getSession(id: string): Promise<PosSessionDto | null> {
    const row = await this.txHost.tx.posSession.findUnique({ where: { id }, include: sessionInclude });
    if (!row) return null;
    const totals = await this.totals([row]);
    return this.toSessionDto(row, totals.get(row.id) ?? emptyTotals(row.openingFloat));
  }

  async getSessionDetail(id: string): Promise<PosSessionDetailDto | null> {
    const session = await this.getSession(id);
    if (!session) return null;
    const [movements, sales, returns] = await Promise.all([
      this.txHost.tx.cashMovement.findMany({ where: { sessionId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.txHost.tx.order.findMany({
        where: { posSessionId: id, status: { not: 'DRAFT' } },
        orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
        include: saleInclude,
      }),
      this.txHost.tx.orderReturn.findMany({
        where: { sessionId: id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { lines: true, order: { select: { number: true } } },
      }),
    ]);
    return {
      ...session,
      movements: movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        amount: movement.amount,
        reason: movement.reason,
        createdAt: movement.createdAt.toISOString(),
      })),
      sales: sales.map(toSaleSummary),
      returns: returns.map((row) => ({ ...toReturnDto(row), orderId: row.orderId, orderNumber: row.order.number })),
    };
  }

  async listSessions(query: PosSessionListQuery, openedBy: string | null): Promise<Paginated<PosSessionDto>> {
    const and: Prisma.PosSessionWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (openedBy) and.push({ openedByUserId: openedBy });
    if (query.cursor) {
      const [openedAt, id] = decodeCursor(query.cursor, 2);
      const date = new Date(String(openedAt));
      and.push({ OR: [{ openedAt: { lt: date } }, { openedAt: date, id: { lt: String(id) } }] });
    }
    const rows = await this.txHost.tx.posSession.findMany({
      where: { AND: and },
      orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: sessionInclude,
    });
    const page = toPage(rows, query.limit, (row) => [row.openedAt.toISOString(), row.id]);
    const totals = await this.totals(page.items);
    return {
      items: page.items.map((row) => this.toSessionDto(row, totals.get(row.id) ?? emptyTotals(row.openingFloat))),
      nextCursor: page.nextCursor,
    };
  }

  async listSales(query: PosSaleListQuery): Promise<Paginated<PosSaleSummaryDto>> {
    const and: Prisma.OrderWhereInput[] = [{ source: 'POS' }, { status: { not: 'DRAFT' } }];
    if (query.sessionId) and.push({ posSessionId: query.sessionId });
    if (query.number) and.push({ number: query.number });
    if (query.cursor) {
      const [createdAt, id] = decodeCursor(query.cursor, 2);
      const date = new Date(String(createdAt));
      and.push({ OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: String(id) } }] });
    }
    const rows = await this.txHost.tx.order.findMany({
      where: { AND: and },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: saleInclude,
    });
    const page = toPage(rows, query.limit, (row) => [row.createdAt.toISOString(), row.id]);
    return { items: page.items.map(toSaleSummary), nextCursor: page.nextCursor };
  }

  async getReturn(id: string): Promise<OrderReturnDto | null> {
    const row = await this.txHost.tx.orderReturn.findUnique({ where: { id }, include: { lines: true } });
    return row ? toReturnDto(row) : null;
  }

  async openCredits(sessionId: string): Promise<PosCreditDto[]> {
    const rows = await this.txHost.tx.orderReturn.findMany({
      where: { sessionId, refundMethod: 'EXCHANGE', creditRemaining: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { number: true } } },
    });
    return rows.map((row) => ({ returnId: row.id, orderId: row.orderId, orderNumber: row.order.number, creditRemaining: row.creditRemaining }));
  }

  async userName(userId: string): Promise<string | null> {
    const row = await this.txHost.tx.user.findUnique({ where: { id: userId }, select: personSelect });
    return row ? personName(row) : null;
  }

  private toSessionDto(row: SessionRow, totals: PosSessionTotalsDto): PosSessionDto {
    const expected = row.status === 'CLOSED' && row.expectedCash !== null ? row.expectedCash : totals.expectedCash;
    return {
      id: row.id,
      label: row.label,
      status: row.status,
      openedBy: toPerson(row.openedBy),
      openedAt: row.openedAt.toISOString(),
      openingFloat: row.openingFloat,
      closedBy: row.closedBy ? toPerson(row.closedBy) : null,
      closedAt: row.closedAt?.toISOString() ?? null,
      countedCash: row.countedCash,
      difference: row.countedCash === null ? null : row.countedCash - expected,
      closingNote: row.closingNote,
      totals: { ...totals, expectedCash: expected },
      version: row.version,
    };
  }

  /** Totaux de plusieurs sessions en quatre requêtes groupées. */
  private async totals(sessions: readonly SessionRow[]): Promise<Map<string, PosSessionTotalsDto>> {
    const ids = sessions.map((session) => session.id);
    if (ids.length === 0) return new Map();
    const [sales, items, payments, refunds, movements] = await Promise.all([
      this.txHost.tx.order.groupBy({
        by: ['posSessionId'],
        where: { posSessionId: { in: ids }, status: { not: 'DRAFT' } },
        _count: { _all: true },
        _sum: { totalAmount: true, discountAmount: true },
      }),
      this.txHost.tx.orderLine.groupBy({
        by: ['orderId'],
        where: { order: { posSessionId: { in: ids }, status: { not: 'DRAFT' } } },
        _sum: { quantity: true },
      }),
      this.txHost.tx.orderPayment.groupBy({
        by: ['sessionId', 'method', 'provider', 'kind'],
        where: { sessionId: { in: ids } },
        _sum: { amount: true },
      }),
      this.txHost.tx.orderReturn.groupBy({ by: ['sessionId'], where: { sessionId: { in: ids } }, _sum: { refundAmount: true } }),
      this.txHost.tx.cashMovement.groupBy({ by: ['sessionId', 'type'], where: { sessionId: { in: ids } }, _sum: { amount: true } }),
    ]);
    const orderSessions = await this.txHost.tx.order.findMany({
      where: { id: { in: items.map((row) => row.orderId) } },
      select: { id: true, posSessionId: true },
    });
    const sessionOfOrder = new Map(orderSessions.map((row) => [row.id, row.posSessionId]));

    const result = new Map<string, PosSessionTotalsDto>();
    for (const session of sessions) {
      const sale = sales.find((row) => row.posSessionId === session.id);
      const itemsCount = items
        .filter((row) => sessionOfOrder.get(row.orderId) === session.id)
        .reduce((sum, row) => sum + (row._sum.quantity ?? 0), 0);
      const own = payments.filter((row) => row.sessionId === session.id);
      const byMethod = new Map<string, PosSessionMethodTotalDto>();
      for (const row of own) {
        const key = `${row.method}|${row.provider ?? ''}`;
        const entry = byMethod.get(key) ?? { method: row.method, provider: row.provider, payments: 0, refunds: 0 };
        if (row.kind === 'PAYMENT') entry.payments += row._sum.amount ?? 0;
        else entry.refunds += row._sum.amount ?? 0;
        byMethod.set(key, entry);
      }
      const cashPayments = own.filter((row) => row.method === 'CASH' && row.kind === 'PAYMENT').reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);
      const cashRefunds = own.filter((row) => row.method === 'CASH' && row.kind === 'REFUND').reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);
      const movementsIn = movements.filter((row) => row.sessionId === session.id && row.type === 'IN').reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);
      const movementsOut = movements.filter((row) => row.sessionId === session.id && row.type === 'OUT').reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);
      const salesAmount = sale?._sum.totalAmount ?? 0;
      const refundAmount = refunds.find((row) => row.sessionId === session.id)?._sum.refundAmount ?? 0;
      result.set(session.id, {
        salesCount: sale?._count._all ?? 0,
        itemsCount,
        salesAmount,
        discountAmount: sale?._sum.discountAmount ?? 0,
        refundAmount,
        netAmount: salesAmount - refundAmount,
        cashPayments,
        cashRefunds,
        movementsIn,
        movementsOut,
        expectedCash: session.openingFloat + cashPayments - cashRefunds + movementsIn - movementsOut,
        byMethod: [...byMethod.values()].sort(
          (a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method) || (a.provider ?? '').localeCompare(b.provider ?? ''),
        ),
      });
    }
    return result;
  }
}

function emptyTotals(openingFloat: number): PosSessionTotalsDto {
  return {
    salesCount: 0,
    itemsCount: 0,
    salesAmount: 0,
    discountAmount: 0,
    refundAmount: 0,
    netAmount: 0,
    cashPayments: 0,
    cashRefunds: 0,
    movementsIn: 0,
    movementsOut: 0,
    expectedCash: openingFloat,
    byMethod: [],
  };
}
