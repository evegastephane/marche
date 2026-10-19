import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { type CashMovementType, parsePosSettings, type PosSettings } from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { ConcurrentModificationError } from '../../../shared/domain/domain-error.js';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { type NewPayment, type NewReturn, PosLedger, PosSessionRepository, PosSettingsStore } from '../application/pos.ports.js';
import type { ReturnedSoFar } from '../domain/order-return.policy.js';
import { PosSession, PosSessionAlreadyOpenError } from '../domain/pos-session.aggregate.js';

type SessionRow = Prisma.PosSessionGetPayload<object>;

function toDomain(row: SessionRow): PosSession {
  return PosSession.reconstitute(
    row.id,
    {
      storeId: row.storeId,
      label: row.label,
      status: row.status,
      openedByUserId: row.openedByUserId,
      openingFloat: row.openingFloat,
      openedAt: row.openedAt,
      closedByUserId: row.closedByUserId,
      closedAt: row.closedAt,
      expectedCash: row.expectedCash,
      countedCash: row.countedCash,
      closingNote: row.closingNote,
    },
    row.version,
  );
}

@Injectable()
export class PrismaPosSessionRepository extends PosSessionRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findById(id: string): Promise<PosSession | null> {
    const row = await this.txHost.tx.posSession.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findOpenByUser(userId: string): Promise<PosSession | null> {
    const row = await this.txHost.tx.posSession.findFirst({ where: { openedByUserId: userId, status: 'OPEN' } });
    return row ? toDomain(row) : null;
  }

  async insert(session: PosSession): Promise<void> {
    const s = session.snapshot();
    try {
      await this.txHost.tx.posSession.create({
        data: {
          id: session.id,
          storeId: s.storeId,
          label: s.label,
          status: s.status,
          openedByUserId: s.openedByUserId,
          openingFloat: s.openingFloat,
          openedAt: s.openedAt,
        },
      });
    } catch (error) {
      // Index partiel « une caisse ouverte par vendeur » : deux ouvertures simultanées (la transaction est perdue).
      if (isUniqueViolation(error)) throw new PosSessionAlreadyOpenError();
      throw error;
    }
  }

  async update(session: PosSession): Promise<void> {
    const s = session.snapshot();
    const { count } = await this.txHost.tx.posSession.updateMany({
      where: { id: session.id, version: session.version },
      data: {
        label: s.label,
        status: s.status,
        closedByUserId: s.closedByUserId,
        closedAt: s.closedAt,
        expectedCash: s.expectedCash,
        countedCash: s.countedCash,
        closingNote: s.closingNote,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConcurrentModificationError('La caisse');
    session.markPersisted();
  }
}

@Injectable()
export class PrismaPosLedger extends PosLedger {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async addPayments(input: { orderId: string; sessionId: string | null; userId: string | null; payments: readonly NewPayment[] }): Promise<void> {
    if (input.payments.length === 0) return;
    await this.txHost.tx.orderPayment.createMany({
      data: input.payments.map((payment) => ({
        storeId: this.actor.storeId,
        orderId: input.orderId,
        sessionId: input.sessionId,
        kind: payment.kind,
        method: payment.method,
        amount: payment.amount,
        tenderedAmount: payment.tenderedAmount,
        provider: payment.provider ?? null,
        reference: payment.reference ?? null,
        returnId: payment.returnId ?? null,
        userId: input.userId,
      })),
    });
  }

  async addMovement(input: { sessionId: string; type: CashMovementType; amount: number; reason: string; userId: string | null }): Promise<void> {
    await this.txHost.tx.cashMovement.create({
      data: {
        storeId: this.actor.storeId,
        sessionId: input.sessionId,
        type: input.type,
        amount: input.amount,
        reason: input.reason,
        userId: input.userId,
      },
    });
  }

  async addReturn(input: NewReturn & { userId: string | null }): Promise<void> {
    await this.txHost.tx.orderReturn.create({
      data: {
        id: input.id,
        storeId: this.actor.storeId,
        orderId: input.orderId,
        sessionId: input.sessionId,
        reason: input.reason,
        restocked: input.restocked,
        refundAmount: input.refundAmount,
        refundMethod: input.refundMethod,
        creditRemaining: input.creditRemaining,
        userId: input.userId,
      },
    });
    await this.txHost.tx.orderReturnLine.createMany({
      data: input.lines.map((line) => ({
        storeId: this.actor.storeId,
        returnId: input.id,
        orderLineId: line.orderLineId,
        quantity: line.quantity,
        amount: line.amount,
        serials: line.serials,
      })),
    });
  }

  async returnedSoFar(orderId: string): Promise<ReturnedSoFar> {
    const lines = await this.txHost.tx.orderReturnLine.findMany({
      where: { orderReturn: { orderId } },
      select: { orderLineId: true, quantity: true, serials: true },
    });
    const result = new Map<string, { quantity: number; serials: Set<string> }>();
    for (const line of lines) {
      const entry = result.get(line.orderLineId) ?? { quantity: 0, serials: new Set<string>() };
      entry.quantity += line.quantity;
      for (const serial of line.serials) entry.serials.add(serial);
      result.set(line.orderLineId, entry);
    }
    return result;
  }

  async consumeCredit(returnId: string, amount: number): Promise<boolean> {
    // UPDATE conditionnel : deux ventes ne peuvent pas consommer le même avoir.
    const { count } = await this.txHost.tx.orderReturn.updateMany({
      where: { id: returnId, refundMethod: 'EXCHANGE', creditRemaining: { gte: amount } },
      data: { creditRemaining: { decrement: amount } },
    });
    return count === 1;
  }

  async expectedCash(sessionId: string): Promise<number> {
    const [session, payments, movements] = await Promise.all([
      this.txHost.tx.posSession.findUnique({ where: { id: sessionId }, select: { openingFloat: true } }),
      this.txHost.tx.orderPayment.groupBy({
        by: ['kind'],
        where: { sessionId, method: 'CASH' },
        _sum: { amount: true },
      }),
      this.txHost.tx.cashMovement.groupBy({ by: ['type'], where: { sessionId }, _sum: { amount: true } }),
    ]);
    const total = (rows: { _sum: { amount: number | null } }[]) => rows.reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);
    const cashIn = total(payments.filter((row) => row.kind === 'PAYMENT'));
    const cashOut = total(payments.filter((row) => row.kind === 'REFUND'));
    const movementsIn = total(movements.filter((row) => row.type === 'IN'));
    const movementsOut = total(movements.filter((row) => row.type === 'OUT'));
    return (session?.openingFloat ?? 0) + cashIn - cashOut + movementsIn - movementsOut;
  }
}

@Injectable()
export class PrismaPosSettingsStore extends PosSettingsStore {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async get(): Promise<PosSettings> {
    const row = await this.txHost.tx.posSettings.findUnique({ where: { storeId: this.actor.storeId } });
    return parsePosSettings(row?.settings ?? null);
  }

  async save(settings: PosSettings): Promise<PosSettings> {
    const storeId = this.actor.storeId;
    const value = settings as unknown as Prisma.InputJsonValue;
    const row = await this.txHost.tx.posSettings.upsert({
      where: { storeId },
      create: { storeId, settings: value },
      update: { settings: value },
    });
    return parsePosSettings(row.settings);
  }
}
