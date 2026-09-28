import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { Currency, Paginated, SpecialRequestDto, SpecialRequestListQuery } from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { decodeCursor, toPage } from '../../../shared/application/pagination.js';
import { ConcurrentModificationError } from '../../../shared/domain/domain-error.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { SpecialRequestsReadModel } from '../application/orders.ports.js';
import { SpecialRequestRepository } from '../domain/order.repositories.js';
import { SpecialRequest, type SpecialRequestData } from '../domain/special-request.aggregate.js';

type SpecialRequestRow = Prisma.SpecialRequestGetPayload<object>;

function parseRequestOptions(value: Prisma.JsonValue): { name: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return [];
    const { name, value: optionValue } = item as Record<string, unknown>;
    return typeof name === 'string' && typeof optionValue === 'string' ? [{ name, value: optionValue }] : [];
  });
}

function toData(row: SpecialRequestRow): SpecialRequestData {
  return {
    storeId: row.storeId,
    productId: row.productId,
    productTitle: row.productTitle,
    productSlug: row.productSlug,
    options: parseRequestOptions(row.options),
    quantity: row.quantity,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    note: row.note,
    currency: row.currency as Currency,
    status: row.status,
    quotedUnitPriceAmount: row.quotedUnitPriceAmount,
    quotedDelay: row.quotedDelay,
    declineReason: row.declineReason,
    orderId: row.orderId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDto(row: SpecialRequestRow): SpecialRequestDto {
  const data = toData(row);
  return {
    id: row.id,
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    version: row.version,
  };
}

@Injectable()
export class PrismaSpecialRequestRepository extends SpecialRequestRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findById(id: string): Promise<SpecialRequest | null> {
    const row = await this.txHost.tx.specialRequest.findUnique({ where: { id } });
    return row ? SpecialRequest.reconstitute(row.id, toData(row), row.version) : null;
  }

  async insert(request: SpecialRequest): Promise<void> {
    const { options, ...data } = request.snapshot();
    await this.txHost.tx.specialRequest.create({
      data: { id: request.id, ...data, options: options as Prisma.InputJsonValue },
    });
  }

  async update(request: SpecialRequest): Promise<void> {
    const r = request.snapshot();
    const { count } = await this.txHost.tx.specialRequest.updateMany({
      where: { id: request.id, version: request.version },
      data: {
        status: r.status,
        quotedUnitPriceAmount: r.quotedUnitPriceAmount,
        quotedDelay: r.quotedDelay,
        declineReason: r.declineReason,
        orderId: r.orderId,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConcurrentModificationError('La demande');
    request.markPersisted();
  }
}

@Injectable()
export class PrismaSpecialRequestsReadModel extends SpecialRequestsReadModel {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async list(query: SpecialRequestListQuery): Promise<Paginated<SpecialRequestDto>> {
    const and: Prisma.SpecialRequestWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.cursor) {
      const [createdAt, id] = decodeCursor(query.cursor, 2);
      const at = new Date(String(createdAt));
      and.push({ OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: String(id) } }] });
    }
    const rows = await this.txHost.tx.specialRequest.findMany({
      where: { AND: and },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = toPage(rows, query.limit, (row) => [row.createdAt.toISOString(), row.id]);
    return { items: page.items.map(toDto), nextCursor: page.nextCursor };
  }

  async get(id: string): Promise<SpecialRequestDto | null> {
    const row = await this.txHost.tx.specialRequest.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  }

  countNew(): Promise<number> {
    return this.txHost.tx.specialRequest.count({ where: { status: 'NEW' } });
  }
}
