import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { StockMovementType } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import {
  type AdjustResult,
  InventoryRepository,
  type LevelState,
} from '../application/inventory.ports.js';
import type { LevelChange } from '../domain/stock-policy.js';

interface LevelRow {
  on_hand: number;
  reserved: number;
  low_stock_threshold: number | null;
}

class InventoryInconsistencyError extends Error {
  constructor(variantId: string, operation: string) {
    super(`Stock incohérent pour la variante ${variantId} (${operation})`);
    this.name = 'InventoryInconsistencyError';
  }
}

/**
 * Chaque écriture est un UPDATE conditionnel atomique : aucune survente possible,
 * même avec des commandes simultanées (docs/ARCHITECTURE.md §5.5). Le SQL brut filtre store_id.
 */
@Injectable()
export class PrismaInventoryRepository extends InventoryRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async initialize(
    entries: readonly { variantId: string; quantity: number }[],
    actorUserId: string | null,
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.txHost.tx.inventoryLevel.createMany({
      data: entries.map((entry) => ({
        variantId: entry.variantId,
        storeId: this.actor.storeId,
        onHand: entry.quantity,
      })),
      skipDuplicates: true,
    });
    const initial = entries.filter((entry) => entry.quantity > 0);
    if (initial.length > 0) {
      await this.txHost.tx.stockMovement.createMany({
        data: initial.map((entry) => ({
          storeId: this.actor.storeId,
          variantId: entry.variantId,
          type: 'INITIAL' as const,
          quantity: entry.quantity,
          onHandAfter: entry.quantity,
          actorUserId,
        })),
      });
    }
  }

  async tryReserve(variantId: string, quantity: number): Promise<LevelChange | null> {
    const [row] = await this.txHost.tx.$queryRaw<LevelRow[]>`
      UPDATE inventory_levels
      SET reserved = reserved + ${quantity}, version = version + 1, updated_at = now()
      WHERE variant_id = ${variantId}::uuid
        AND store_id = ${this.actor.storeId}::uuid
        AND on_hand - reserved >= ${quantity}
      RETURNING on_hand, reserved, low_stock_threshold`;
    if (!row) return null;
    return {
      variantId,
      before: { onHand: row.on_hand, reserved: row.reserved - quantity },
      after: { onHand: row.on_hand, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async release(variantId: string, quantity: number): Promise<LevelChange> {
    const [row] = await this.txHost.tx.$queryRaw<LevelRow[]>`
      UPDATE inventory_levels
      SET reserved = reserved - ${quantity}, version = version + 1, updated_at = now()
      WHERE variant_id = ${variantId}::uuid
        AND store_id = ${this.actor.storeId}::uuid
        AND reserved >= ${quantity}
      RETURNING on_hand, reserved, low_stock_threshold`;
    if (!row) throw new InventoryInconsistencyError(variantId, 'libération');
    return {
      variantId,
      before: { onHand: row.on_hand, reserved: row.reserved + quantity },
      after: { onHand: row.on_hand, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async commit(variantId: string, quantity: number, orderId: string): Promise<LevelChange> {
    const [row] = await this.txHost.tx.$queryRaw<LevelRow[]>`
      UPDATE inventory_levels
      SET on_hand = on_hand - ${quantity}, reserved = reserved - ${quantity},
          version = version + 1, updated_at = now()
      WHERE variant_id = ${variantId}::uuid
        AND store_id = ${this.actor.storeId}::uuid
        AND reserved >= ${quantity}
        AND on_hand >= ${quantity}
      RETURNING on_hand, reserved, low_stock_threshold`;
    if (!row) throw new InventoryInconsistencyError(variantId, 'expédition');
    await this.recordMovement({
      variantId,
      type: 'SALE',
      quantity: -quantity,
      onHandAfter: row.on_hand,
      orderId,
      reason: null,
      actorUserId: this.actor.userId,
    });
    return {
      variantId,
      before: { onHand: row.on_hand + quantity, reserved: row.reserved + quantity },
      after: { onHand: row.on_hand, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async adjust(input: {
    variantId: string;
    delta: number;
    type: StockMovementType;
    reason: string | null;
    actorUserId: string | null;
  }): Promise<AdjustResult> {
    const [row] = await this.txHost.tx.$queryRaw<LevelRow[]>`
      UPDATE inventory_levels
      SET on_hand = on_hand + ${input.delta}, version = version + 1, updated_at = now()
      WHERE variant_id = ${input.variantId}::uuid
        AND store_id = ${this.actor.storeId}::uuid
        AND on_hand + ${input.delta} >= reserved
      RETURNING on_hand, reserved, low_stock_threshold`;
    if (!row) {
      const exists = await this.txHost.tx.inventoryLevel.count({ where: { variantId: input.variantId } });
      return exists > 0 ? 'below_reserved' : 'not_found';
    }
    await this.recordMovement({
      variantId: input.variantId,
      type: input.type,
      quantity: input.delta,
      onHandAfter: row.on_hand,
      orderId: null,
      reason: input.reason,
      actorUserId: input.actorUserId,
    });
    return {
      variantId: input.variantId,
      before: { onHand: row.on_hand - input.delta, reserved: row.reserved },
      after: { onHand: row.on_hand, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async setThreshold(variantId: string, threshold: number | null): Promise<boolean> {
    const { count } = await this.txHost.tx.inventoryLevel.updateMany({
      where: { variantId },
      data: { lowStockThreshold: threshold },
    });
    return count > 0;
  }

  async getLevels(variantIds: readonly string[]): Promise<Map<string, LevelState>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.txHost.tx.inventoryLevel.findMany({
      where: { variantId: { in: [...new Set(variantIds)] } },
    });
    return new Map(
      rows.map((row) => [
        row.variantId,
        {
          variantId: row.variantId,
          onHand: row.onHand,
          reserved: row.reserved,
          lowStockThreshold: row.lowStockThreshold,
          updatedAt: row.updatedAt,
        },
      ]),
    );
  }

  private async recordMovement(movement: {
    variantId: string;
    type: StockMovementType;
    quantity: number;
    onHandAfter: number;
    orderId: string | null;
    reason: string | null;
    actorUserId: string | null;
  }): Promise<void> {
    await this.txHost.tx.stockMovement.create({
      data: { ...movement, storeId: this.actor.storeId },
    });
  }
}
