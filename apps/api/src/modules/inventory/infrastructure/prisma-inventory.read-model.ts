import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type {
  InventoryItemDto,
  InventoryListQuery,
  Paginated,
  StockMovementDto,
} from '@marche/contracts';
import { Prisma } from '../../../generated/prisma/client.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { decodeCursor, toPage } from '../../../shared/application/pagination.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { MediaFacade } from '../../media/media.facade.js';
import { InventoryReadModel } from '../application/inventory.ports.js';

interface InventoryRow {
  variant_id: string;
  product_id: string;
  product_title: string;
  sku: string;
  option_values: unknown;
  on_hand: number;
  reserved: number;
  available: number;
  low_stock_threshold: number | null;
  updated_at: Date;
  thumbnail_media_id: string | null;
}

/**
 * Vue de lecture (CQRS) : joint les tables du catalogue en lecture seule
 * pour afficher titres et SKU (exception documentée, docs/PLAN-CODE.md §2.2).
 */
@Injectable()
export class PrismaInventoryReadModel extends InventoryReadModel {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
    private readonly media: MediaFacade,
  ) {
    super();
  }

  async list(query: InventoryListQuery, defaultThreshold: number): Promise<Paginated<InventoryItemDto>> {
    const storeId = this.actor.storeId;
    const filters: Prisma.Sql[] = [];
    if (query.filter === 'low') {
      filters.push(Prisma.sql`AND il.on_hand - il.reserved <= COALESCE(il.low_stock_threshold, ${defaultThreshold})`);
    } else if (query.filter === 'out') {
      filters.push(Prisma.sql`AND il.on_hand - il.reserved <= 0`);
    }
    if (query.q) {
      const pattern = `%${query.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      filters.push(Prisma.sql`AND (p.title ILIKE ${pattern} OR v.sku ILIKE ${pattern})`);
    }
    if (query.cursor) {
      const [available, variantId] = decodeCursor(query.cursor, 2);
      filters.push(
        Prisma.sql`AND (il.on_hand - il.reserved, il.variant_id) > (${Number(available)}, ${String(variantId)}::uuid)`,
      );
    }

    const rows = await this.txHost.tx.$queryRaw<InventoryRow[]>`
      SELECT il.variant_id, v.product_id, p.title AS product_title, v.sku, v.option_values,
             il.on_hand, il.reserved, il.on_hand - il.reserved AS available,
             il.low_stock_threshold, il.updated_at, thumb.media_id AS thumbnail_media_id
      FROM inventory_levels il
      JOIN product_variants v ON v.id = il.variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN LATERAL (
        SELECT pm.media_id FROM product_media pm
        WHERE pm.product_id = p.id ORDER BY pm.position LIMIT 1
      ) thumb ON true
      WHERE il.store_id = ${storeId}::uuid
        AND v.archived_at IS NULL
        AND p.archived_at IS NULL
        AND v.track_inventory = true
        ${filters.length > 0 ? Prisma.join(filters, ' ') : Prisma.empty}
      ORDER BY il.on_hand - il.reserved ASC, il.variant_id ASC
      LIMIT ${query.limit + 1}`;

    const page = toPage(rows, query.limit, (row) => [row.available, row.variant_id]);
    const thumbnails = await this.media.getMany(
      page.items.map((row) => row.thumbnail_media_id).filter((id): id is string => id !== null),
    );
    return {
      nextCursor: page.nextCursor,
      items: page.items.map((row) => {
        const threshold = row.low_stock_threshold ?? defaultThreshold;
        const values = Array.isArray(row.option_values) ? row.option_values.map(String) : [];
        const thumbnail = row.thumbnail_media_id ? thumbnails.get(row.thumbnail_media_id) : undefined;
        return {
          variantId: row.variant_id,
          productId: row.product_id,
          productTitle: row.product_title,
          variantTitle: values.length > 0 ? values.join(' / ') : 'Par défaut',
          sku: row.sku,
          thumbnailUrl: thumbnail ? (thumbnail.renditions['400'] ?? thumbnail.url) : null,
          onHand: row.on_hand,
          reserved: row.reserved,
          available: row.available,
          lowStockThreshold: threshold,
          hasCustomThreshold: row.low_stock_threshold !== null,
          isLow: row.available <= threshold,
          isOut: row.available <= 0,
          updatedAt: row.updated_at.toISOString(),
        };
      }),
    };
  }

  async movements(
    variantId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<Paginated<StockMovementDto>> {
    const where: Prisma.StockMovementWhereInput = { variantId };
    if (cursor) {
      const [createdAt, id] = decodeCursor(cursor, 2);
      const date = new Date(String(createdAt));
      where.OR = [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: String(id) } }];
    }
    const rows = await this.txHost.tx.stockMovement.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = toPage(rows, limit, (row) => [row.createdAt.toISOString(), row.id]);
    return {
      nextCursor: page.nextCursor,
      items: page.items.map((row) => ({
        id: row.id,
        type: row.type,
        quantity: row.quantity,
        onHandAfter: row.onHandAfter,
        reason: row.reason,
        orderId: row.orderId,
        actorUserId: row.actorUserId,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
