import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  type Currency,
  DEFAULT_SHIPPING_SETTINGS,
  shippingSettingsSchema,
  verticalSettingsSchema,
} from '@marche/contracts';
import type { MemberRole } from '../../../shared/application/actor-context.port.js';
import type { Prisma, Store as StoreRow } from '../../../generated/prisma/client.js';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { Store } from '../domain/store.aggregate.js';
import { StoreSlugTakenError } from '../domain/store.errors.js';
import { StoreMembershipRepository, StoreRepository } from '../domain/store.repository.js';

function toDomain(row: StoreRow): Store {
  const shipping = shippingSettingsSchema.safeParse(row.shippingSettings);
  const vertical = verticalSettingsSchema.safeParse(row.verticalSettings);
  return Store.reconstitute(row.id, {
    clerkOrgId: row.clerkOrgId,
    name: row.name,
    slug: row.slug,
    currency: row.currency as Currency,
    country: row.country,
    timezone: row.timezone,
    contactEmail: row.contactEmail,
    phone: row.phone,
    logoMediaId: row.logoMediaId,
    shippingSettings: shipping.success ? shipping.data : DEFAULT_SHIPPING_SETTINGS,
    lowStockDefault: row.lowStockDefault,
    type: row.type,
    verticalSettings: vertical.success ? vertical.data : {},
    createdAt: row.createdAt,
    archivedAt: row.archivedAt,
  });
}

function toData(store: Store) {
  const s = store.snapshot();
  return {
    name: s.name,
    slug: s.slug,
    currency: s.currency,
    country: s.country,
    timezone: s.timezone,
    contactEmail: s.contactEmail,
    phone: s.phone,
    logoMediaId: s.logoMediaId,
    shippingSettings: s.shippingSettings as Prisma.InputJsonValue,
    lowStockDefault: s.lowStockDefault,
    type: s.type,
    verticalSettings: s.verticalSettings as Prisma.InputJsonValue,
    archivedAt: s.archivedAt,
  };
}

/** La table `stores` n'est pas « tenant » : chaque requête cible explicitement une boutique. */
@Injectable()
export class PrismaStoreRepository extends StoreRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findById(id: string): Promise<Store | null> {
    const row = await this.txHost.tx.store.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByClerkOrgId(clerkOrgId: string): Promise<Store | null> {
    const row = await this.txHost.tx.store.findUnique({ where: { clerkOrgId } });
    return row ? toDomain(row) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.txHost.tx.store.count({ where: { slug } })) > 0;
  }

  async insert(store: Store): Promise<void> {
    try {
      await this.txHost.tx.store.create({
        data: {
          id: store.id,
          clerkOrgId: store.clerkOrgId,
          createdAt: store.snapshot().createdAt,
          ...toData(store),
          counter: { create: {} },
        },
      });
    } catch (error) {
      if (isUniqueViolation(error, 'slug')) throw new StoreSlugTakenError(store.slug);
      throw error;
    }
  }

  async update(store: Store): Promise<void> {
    await this.txHost.tx.store.update({ where: { id: store.id }, data: toData(store) });
  }

  async nextOrderNumber(storeId: string): Promise<number> {
    const rows = await this.txHost.tx.$queryRaw<{ order_seq: number }[]>`
      UPDATE store_counters SET order_seq = order_seq + 1
      WHERE store_id = ${storeId}::uuid
      RETURNING order_seq`;
    const next = rows[0]?.order_seq;
    if (next === undefined) throw new Error(`Compteur de commandes absent pour la boutique ${storeId}`);
    return next;
  }
}

@Injectable()
export class PrismaStoreMembershipRepository extends StoreMembershipRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findRole(storeId: string, userId: string): Promise<MemberRole | null> {
    const row = await this.txHost.tx.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
      select: { role: true },
    });
    return row?.role ?? null;
  }

  async upsert(storeId: string, userId: string, role: MemberRole): Promise<MemberRole> {
    const current = await this.findRole(storeId, userId);
    if (current === 'OWNER') return current;
    const row = await this.txHost.tx.storeMember.upsert({
      where: { storeId_userId: { storeId, userId } },
      create: { storeId, userId, role },
      update: { role },
      select: { role: true },
    });
    return row.role;
  }

  async remove(storeId: string, userId: string): Promise<void> {
    await this.txHost.tx.storeMember.deleteMany({ where: { storeId, userId } });
  }

  async ownerEmails(storeId: string): Promise<string[]> {
    const rows = await this.txHost.tx.storeMember.findMany({
      where: { storeId, role: 'OWNER', user: { deletedAt: null } },
      select: { user: { select: { email: true } } },
    });
    return rows.map((row) => row.user.email).filter((email) => email.length > 0);
  }
}
