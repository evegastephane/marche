import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { PLACEHOLDER_SERIAL_PREFIX, type StockMovementType, type UnitCondition } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import {
  type AdjustResult,
  type InitialStock,
  InventoryRepository,
  type LevelState,
  type SoldUnits,
  type UnitEntry,
  type UnitRecord,
} from '../application/inventory.ports.js';
import { type LevelChange, SerialTakenError } from '../domain/stock-policy.js';

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

const unitSelect = {
  id: true,
  variantId: true,
  serial: true,
  condition: true,
  batteryHealth: true,
  status: true,
  notes: true,
  orderLineId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Le journal fait foi (règle 1) : le stock en main ne bouge que par l'insertion d'un mouvement,
 * que la base applique elle-même à inventory_levels (déclencheur stock_movements_apply) ; une mise à
 * jour directe de on_hand est refusée. Les réservations restent des UPDATE conditionnels atomiques :
 * aucune survente possible, même avec des commandes simultanées (docs/ARCHITECTURE.md §5.5).
 * Suivi à l'unité (règle 6) : chaque IMEI entre et sort par son propre mouvement ±1.
 * Le SQL brut filtre store_id.
 */
@Injectable()
export class PrismaInventoryRepository extends InventoryRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async initialize(entries: readonly InitialStock[], actorUserId: string | null): Promise<void> {
    if (entries.length === 0) return;
    // Un niveau naît à 0 ; le stock initial est un mouvement INITIAL (appliqué par la base).
    await this.txHost.tx.inventoryLevel.createMany({
      data: entries.map((entry) => ({
        variantId: entry.variantId,
        storeId: this.actor.storeId,
        tracksUnits: entry.tracksUnits ?? false,
      })),
      skipDuplicates: true,
    });
    const counted = entries.filter((entry) => !entry.tracksUnits && entry.quantity > 0);
    if (counted.length > 0) {
      await this.txHost.tx.stockMovement.createMany({
        data: counted.map((entry) => ({
          storeId: this.actor.storeId,
          variantId: entry.variantId,
          type: 'INITIAL' as const,
          quantity: entry.quantity,
          onHandAfter: 0, // calculé par la base
          actorUserId,
        })),
      });
    }
    for (const entry of entries) {
      if (entry.tracksUnits && entry.units?.length) {
        await this.insertUnits(entry.variantId, entry.units, entry.condition ?? 'NEW', 'INITIAL', null, actorUserId);
      }
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

  async commit(variantId: string, quantity: number, orderId: string, units?: SoldUnits): Promise<LevelChange> {
    // La réservation est levée, puis chaque mouvement SALE fait sortir le stock en main.
    const [row] = await this.txHost.tx.$queryRaw<LevelRow[]>`
      UPDATE inventory_levels
      SET reserved = reserved - ${quantity}, version = version + 1, updated_at = now()
      WHERE variant_id = ${variantId}::uuid
        AND store_id = ${this.actor.storeId}::uuid
        AND reserved >= ${quantity}
        AND on_hand >= ${quantity}
      RETURNING on_hand, reserved, low_stock_threshold`;
    if (!row) throw new InventoryInconsistencyError(variantId, 'expédition');
    let onHandAfter = row.on_hand;
    if (units) {
      for (const serial of units.serials) {
        const unitId =
          (await this.markUnit(variantId, serial, 'IN_STOCK', 'SOLD', units.orderLineId)) ??
          (await this.sellPlaceholder(variantId, serial, units.orderLineId));
        if (!unitId) {
          throw new ValidationError('UNIT_TRACKED_VARIANT', `L’IMEI « ${serial} » n’est pas en stock pour cet article`, {
            variantId,
            serial,
          });
        }
        onHandAfter = await this.recordMovement({
          variantId,
          type: 'SALE',
          quantity: -1,
          orderId,
          reason: null,
          actorUserId: this.actor.userId,
          stockUnitId: unitId,
        });
      }
    } else {
      onHandAfter = await this.recordMovement({
        variantId,
        type: 'SALE',
        quantity: -quantity,
        orderId,
        reason: null,
        actorUserId: this.actor.userId,
      });
    }
    return {
      variantId,
      before: { onHand: onHandAfter + quantity, reserved: row.reserved + quantity },
      after: { onHand: onHandAfter, reserved: row.reserved },
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
    // Verrou de la ligne : le contrôle « stock ≥ réservé » et le mouvement forment un tout.
    const row = await this.lockLevel(input.variantId);
    if (!row) return 'not_found';
    if (row.on_hand + input.delta < row.reserved) return 'below_reserved';
    const onHandAfter = await this.recordMovement({ ...input, quantity: input.delta, orderId: null });
    return {
      variantId: input.variantId,
      before: { onHand: row.on_hand, reserved: row.reserved },
      after: { onHand: onHandAfter, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async receiveUnits(input: {
    variantId: string;
    units: readonly UnitEntry[];
    condition: UnitCondition;
    type: 'RECEIPT' | 'RETURN';
    reason: string | null;
    actorUserId: string | null;
  }): Promise<LevelChange | 'not_found'> {
    const row = await this.lockLevel(input.variantId);
    if (!row) return 'not_found';
    const onHandAfter = await this.insertUnits(input.variantId, input.units, input.condition, input.type, input.reason, input.actorUserId);
    return {
      variantId: input.variantId,
      before: { onHand: row.on_hand, reserved: row.reserved },
      after: { onHand: onHandAfter, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async findUnit(unitId: string): Promise<UnitRecord | null> {
    return this.txHost.tx.stockUnit.findUnique({ where: { id: unitId }, select: unitSelect });
  }

  async findUnitBySerial(serial: string): Promise<UnitRecord | null> {
    return this.txHost.tx.stockUnit.findFirst({ where: { serial }, select: unitSelect });
  }

  async moveUnit(input: { unit: UnitRecord; to: 'REMOVED' | 'IN_STOCK'; reason: string; actorUserId: string | null }): Promise<AdjustResult> {
    const { unit } = input;
    const row = await this.lockLevel(unit.variantId);
    if (!row) return 'not_found';
    const delta = input.to === 'IN_STOCK' ? 1 : -1;
    if (row.on_hand + delta < row.reserved) return 'below_reserved';
    const from = input.to === 'IN_STOCK' ? unit.status : 'IN_STOCK';
    const unitId = await this.markUnit(unit.variantId, unit.serial, from, input.to, input.to === 'IN_STOCK' ? null : unit.orderLineId);
    if (!unitId) throw new InventoryInconsistencyError(unit.variantId, 'unité');
    const onHandAfter = await this.recordMovement({
      variantId: unit.variantId,
      type: input.to === 'IN_STOCK' ? 'RETURN' : 'LOSS',
      quantity: delta,
      orderId: null,
      reason: input.reason,
      actorUserId: input.actorUserId,
      stockUnitId: unitId,
    });
    return {
      variantId: unit.variantId,
      before: { onHand: row.on_hand, reserved: row.reserved },
      after: { onHand: onHandAfter, reserved: row.reserved },
      lowStockThreshold: row.low_stock_threshold,
    };
  }

  async updateUnit(
    unitId: string,
    patch: { serial?: string; batteryHealth?: number | null; notes?: string | null },
  ): Promise<UnitRecord> {
    try {
      return await this.txHost.tx.stockUnit.update({ where: { id: unitId }, data: patch, select: unitSelect });
    } catch (error) {
      if (isUniqueViolation(error) && patch.serial) throw new SerialTakenError([patch.serial]);
      throw error;
    }
  }

  async setTracking(variantIds: readonly string[], tracksUnits: boolean): Promise<void> {
    if (variantIds.length === 0) return;
    await this.txHost.tx.inventoryLevel.updateMany({ where: { variantId: { in: [...variantIds] } }, data: { tracksUnits } });
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
          tracksUnits: row.tracksUnits,
          updatedAt: row.updatedAt,
        },
      ]),
    );
  }

  private async lockLevel(variantId: string): Promise<LevelRow | undefined> {
    const [row] = await this.txHost.tx.$queryRaw<LevelRow[]>`
      SELECT on_hand, reserved, low_stock_threshold FROM inventory_levels
      WHERE variant_id = ${variantId}::uuid AND store_id = ${this.actor.storeId}::uuid
      FOR UPDATE`;
    return row;
  }

  /** Crée les unités (IMEI unique dans la boutique) et un mouvement +1 par unité ; renvoie le stock obtenu. */
  private async insertUnits(
    variantId: string,
    units: readonly UnitEntry[],
    condition: UnitCondition,
    type: StockMovementType,
    reason: string | null,
    actorUserId: string | null,
  ): Promise<number> {
    const rows = units.map((unit) => ({
      id: newId(),
      storeId: this.actor.storeId,
      variantId,
      serial: unit.serial,
      condition,
      batteryHealth: unit.batteryHealth ?? null,
      notes: unit.notes ?? null,
    }));
    const taken = await this.txHost.tx.stockUnit.findMany({
      where: { serial: { in: rows.map((row) => row.serial) } },
      select: { serial: true },
    });
    if (taken.length > 0) throw new SerialTakenError(taken.map((unit) => unit.serial));
    try {
      await this.txHost.tx.stockUnit.createMany({ data: rows });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SerialTakenError(rows.map((row) => row.serial));
      throw error;
    }
    let onHandAfter = 0;
    for (const row of rows) {
      onHandAfter = await this.recordMovement({
        variantId,
        type,
        quantity: 1,
        orderId: null,
        reason,
        actorUserId,
        stockUnitId: row.id,
      });
    }
    return onHandAfter;
  }

  /** Change le statut d'une unité si elle est dans l'état attendu ; renvoie son id, ou null. */
  private async markUnit(
    variantId: string,
    serial: string,
    from: string,
    to: 'IN_STOCK' | 'SOLD' | 'REMOVED',
    orderLineId: string | null,
  ): Promise<string | null> {
    const [row] = await this.txHost.tx.$queryRaw<{ id: string }[]>`
      UPDATE stock_units
      SET status = ${to}::"StockUnitStatus", order_line_id = ${orderLineId}::uuid, updated_at = now()
      WHERE store_id = ${this.actor.storeId}::uuid
        AND variant_id = ${variantId}::uuid
        AND serial = ${serial}
        AND status = ${from}::"StockUnitStatus"
      RETURNING id`;
    return row?.id ?? null;
  }

  /**
   * Stock repris d'avant le suivi à l'unité : l'IMEI saisi à l'expédition remplace un numéro
   * provisoire (A-SAISIR-…) de la variante. Un IMEI déjà connu de la boutique (vendu, ou en stock
   * sur une autre déclinaison) ne remplace rien : l'appelant le signale « pas en stock ».
   */
  private async sellPlaceholder(variantId: string, serial: string, orderLineId: string | null): Promise<string | null> {
    if (serial.startsWith(PLACEHOLDER_SERIAL_PREFIX)) return null;
    if ((await this.txHost.tx.stockUnit.count({ where: { serial } })) > 0) return null;
    const [row] = await this.txHost.tx.$queryRaw<{ id: string }[]>`
      UPDATE stock_units
      SET serial = ${serial}, status = 'SOLD'::"StockUnitStatus", order_line_id = ${orderLineId}::uuid, updated_at = now()
      WHERE id = (
        SELECT id FROM stock_units
        WHERE store_id = ${this.actor.storeId}::uuid
          AND variant_id = ${variantId}::uuid
          AND status = 'IN_STOCK'::"StockUnitStatus"
          AND serial LIKE ${`${PLACEHOLDER_SERIAL_PREFIX}%`}
        ORDER BY created_at, id
        LIMIT 1
        FOR UPDATE
      )
      RETURNING id`;
    return row?.id ?? null;
  }

  /** Insère un mouvement ; la base l'applique au stock en main et renvoie le stock obtenu. */
  private async recordMovement(movement: {
    variantId: string;
    type: StockMovementType;
    quantity: number;
    orderId: string | null;
    reason: string | null;
    actorUserId: string | null;
    stockUnitId?: string | null;
  }): Promise<number> {
    const created = await this.txHost.tx.stockMovement.create({
      data: {
        storeId: this.actor.storeId,
        variantId: movement.variantId,
        type: movement.type,
        quantity: movement.quantity,
        orderId: movement.orderId,
        reason: movement.reason,
        actorUserId: movement.actorUserId,
        stockUnitId: movement.stockUnitId ?? null,
        // Écrasé par le trigger stock_movements_apply (stock obtenu après le mouvement).
        onHandAfter: 0,
      },
      select: { onHandAfter: true },
    });
    return created.onHandAfter;
  }
}
