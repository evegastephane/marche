import { Injectable } from '@nestjs/common';
import type {
  AdjustStockInput,
  StockCountInput,
  InsufficientStockDetail,
  InventoryItemDto,
  InventoryLevelDto,
  InventoryListQuery,
  Paginated,
  ReceiveUnitsInput,
  StockMovementDto,
  StockUnitDto,
  UnitListQuery,
  UnitMovementInput,
  UpdateUnitInput,
} from '@marche/contracts';
import { isPlaceholderSerial } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { ConcurrentModificationError, NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import {
  aggregateLines,
  availableOf,
  InsufficientStockError,
  type LevelChange,
  movementDelta,
  reasonRequired,
  StockBelowReservedError,
  stockTransitionEvents,
  UnitTrackedVariantError,
} from '../domain/stock-policy.js';
import {
  type InitialStock,
  InventoryReadModel,
  InventoryRepository,
  type LevelState,
  type UnitRecord,
} from './inventory.ports.js';

export interface StockLine {
  variantId: string;
  quantity: number;
}

/** Ligne expédiée : pour une variante suivie à l'unité, les IMEI des pièces qui partent. */
export interface ShippedLine extends StockLine {
  serials?: readonly string[];
  orderLineId?: string | null;
}

export function toUnitDto(unit: UnitRecord): StockUnitDto {
  return {
    id: unit.id,
    variantId: unit.variantId,
    serial: unit.serial,
    placeholder: isPlaceholderSerial(unit.serial),
    condition: unit.condition,
    batteryHealth: unit.batteryHealth,
    status: unit.status,
    notes: unit.notes,
    orderLineId: unit.orderLineId,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}

function toLevelDto(state: LevelState): InventoryLevelDto {
  return {
    variantId: state.variantId,
    onHand: state.onHand,
    reserved: state.reserved,
    available: availableOf(state),
    lowStockThreshold: state.lowStockThreshold,
    tracksUnits: state.tracksUnits,
    updatedAt: state.updatedAt.toISOString(),
  };
}

/**
 * Cas d'usage du stock. Les écritures s'exécutent dans l'unité de travail courante :
 * appelées depuis le passage d'une commande, elles partagent sa transaction (R5).
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly readModel: InventoryReadModel,
    private readonly stores: StoresFacade,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  /** Stock initial des nouvelles variantes : un mouvement INITIAL, ou un par unité (IMEI). */
  initialize(entries: readonly InitialStock[]): Promise<void> {
    return this.repository.initialize(entries, this.actor.userId);
  }

  /** R5 : réserve toutes les lignes ou aucune (l'exception annule la transaction englobante). */
  async reserve(lines: readonly StockLine[]): Promise<void> {
    await this.uow.run(async () => {
      const changes: LevelChange[] = [];
      const failures: InsufficientStockDetail[] = [];
      for (const line of aggregateLines(lines)) {
        const change = await this.repository.tryReserve(line.variantId, line.quantity);
        if (change) {
          changes.push(change);
        } else {
          failures.push({ variantId: line.variantId, requested: line.quantity, available: 0 });
        }
      }
      if (failures.length > 0) {
        const levels = await this.repository.getLevels(failures.map((f) => f.variantId));
        throw new InsufficientStockError(
          failures.map((failure) => {
            const level = levels.get(failure.variantId);
            return { ...failure, available: level ? Math.max(availableOf(level), 0) : 0 };
          }),
        );
      }
      await this.publishTransitions(changes);
    });
  }

  /** Annulation d'une commande passée : libère la réservation. */
  async release(lines: readonly StockLine[]): Promise<void> {
    await this.uow.run(async () => {
      const changes: LevelChange[] = [];
      for (const line of aggregateLines(lines)) {
        changes.push(await this.repository.release(line.variantId, line.quantity));
      }
      await this.publishTransitions(changes);
    });
  }

  /**
   * Expédition : le stock réservé quitte l'entrepôt (mouvement SALE). Une variante suivie à l'unité
   * sort pièce par pièce : les IMEI fournis doivent être en stock, un par unité expédiée.
   */
  async commit(lines: readonly ShippedLine[], orderId: string): Promise<void> {
    await this.uow.run(async () => {
      const levels = await this.repository.getLevels(lines.map((line) => line.variantId));
      const changes: LevelChange[] = [];
      // Les lignes suivies à l'unité restent séparées (chacune porte ses IMEI) ; les autres sont regroupées.
      const tracked = lines.filter((line) => levels.get(line.variantId)?.tracksUnits);
      const counted = lines.filter((line) => !levels.get(line.variantId)?.tracksUnits);
      for (const line of [...tracked].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        const serials = [...new Set(line.serials ?? [])];
        if (serials.length !== line.quantity) {
          throw new UnitTrackedVariantError(
            line.variantId,
            line.quantity === 1
              ? 'Article suivi à l’unité : indiquez l’IMEI de la pièce expédiée'
              : `Article suivi à l’unité : indiquez les ${line.quantity} IMEI des pièces expédiées`,
          );
        }
        changes.push(
          await this.repository.commit(line.variantId, line.quantity, orderId, { serials, orderLineId: line.orderLineId ?? null }),
        );
      }
      for (const line of aggregateLines(counted)) {
        changes.push(await this.repository.commit(line.variantId, line.quantity, orderId));
      }
      await this.publishTransitions(changes);
    });
  }

  /** UC-20 : réception, correction, perte, retour. */
  async adjust(variantId: string, input: AdjustStockInput): Promise<InventoryLevelDto> {
    if (reasonRequired(input.type) && !input.reason) {
      throw new ValidationError('VALIDATION_FAILED', 'Le motif est obligatoire pour ce mouvement');
    }
    const delta = movementDelta(input.type, input.quantity);
    return this.uow.run(async () => {
      await this.assertCounted([variantId]);
      const result = await this.repository.adjust({
        variantId,
        delta,
        type: input.type,
        reason: input.reason ?? null,
        actorUserId: this.actor.userId,
      });
      if (result === 'not_found') throw new NotFoundError('Stock de la variante', variantId);
      if (result === 'below_reserved') throw new StockBelowReservedError(variantId);
      await this.publishTransitions([result]);
      const level = (await this.repository.getLevels([variantId])).get(variantId);
      if (!level) throw new NotFoundError('Stock de la variante', variantId);
      return toLevelDto(level);
    });
  }

  /** Comptage : chaque écart devient un ajustement (motif « Comptage »), dans une seule transaction. */
  async count(input: StockCountInput): Promise<InventoryLevelDto[]> {
    const variantIds = input.entries.map((entry) => entry.variantId);
    return this.uow.run(async () => {
      await this.assertCounted(variantIds);
      const levels = await this.repository.getLevels(variantIds);
      const changes: LevelChange[] = [];
      for (const entry of input.entries) {
        const level = levels.get(entry.variantId);
        if (!level) throw new NotFoundError('Stock de la variante', entry.variantId);
        if (entry.expectedOnHand !== undefined && entry.expectedOnHand !== level.onHand) {
          throw new ConcurrentModificationError('Le stock');
        }
        const delta = entry.onHand - level.onHand;
        if (delta === 0) continue;
        const result = await this.repository.adjust({
          variantId: entry.variantId,
          delta,
          type: 'ADJUSTMENT',
          reason: input.reason,
          actorUserId: this.actor.userId,
        });
        if (result === 'not_found') throw new NotFoundError('Stock de la variante', entry.variantId);
        if (result === 'below_reserved') throw new StockBelowReservedError(entry.variantId);
        changes.push(result);
      }
      await this.publishTransitions(changes);
      const updated = await this.repository.getLevels(variantIds);
      return variantIds.flatMap((id) => {
        const level = updated.get(id);
        return level ? [toLevelDto(level)] : [];
      });
    });
  }

  async setThreshold(variantId: string, threshold: number | null): Promise<InventoryLevelDto> {
    const updated = await this.repository.setThreshold(variantId, threshold);
    if (!updated) throw new NotFoundError('Stock de la variante', variantId);
    const level = (await this.repository.getLevels([variantId])).get(variantId);
    if (!level) throw new NotFoundError('Stock de la variante', variantId);
    return toLevelDto(level);
  }

  async list(query: InventoryListQuery): Promise<Paginated<InventoryItemDto>> {
    const settings = await this.stores.getSettings(this.actor.storeId);
    return this.readModel.list(query, settings.lowStockDefault);
  }

  movements(variantId: string, cursor: string | undefined, limit: number): Promise<Paginated<StockMovementDto>> {
    return this.readModel.movements(variantId, cursor, limit);
  }

  // ───────────── Unités (IMEI, numéros de série) ─────────────

  knownSerials(serials: readonly string[]): Promise<Map<string, string>> {
    return this.readModel.knownSerials(serials);
  }

  units(variantId: string, query: UnitListQuery): Promise<Paginated<StockUnitDto>> {
    return this.readModel.units(variantId, query);
  }

  /** Réception d'unités : une par IMEI, chacune avec son mouvement +1. */
  async receiveUnits(variantId: string, input: ReceiveUnitsInput): Promise<InventoryLevelDto> {
    return this.uow.run(async () => {
      const level = (await this.repository.getLevels([variantId])).get(variantId);
      if (!level) throw new NotFoundError('Stock de la variante', variantId);
      if (!level.tracksUnits) {
        throw new UnitTrackedVariantError(variantId, 'Cet article n’est pas suivi à l’unité : ajustez son stock directement');
      }
      const result = await this.repository.receiveUnits({
        variantId,
        units: input.units,
        condition: input.condition,
        type: 'RECEIPT',
        reason: input.reason ?? null,
        actorUserId: this.actor.userId,
      });
      if (result === 'not_found') throw new NotFoundError('Stock de la variante', variantId);
      await this.publishTransitions([result]);
      return this.levelDto(variantId);
    });
  }

  /** Sortie d'une unité en stock (perte, vol, défaut) : mouvement LOSS −1 avec son motif. */
  removeUnit(unitId: string, input: UnitMovementInput): Promise<StockUnitDto> {
    return this.moveUnit(unitId, 'REMOVED', input.reason);
  }

  /** Retour en stock d'une unité vendue ou sortie : mouvement RETURN +1. */
  returnUnit(unitId: string, input: UnitMovementInput): Promise<StockUnitDto> {
    return this.moveUnit(unitId, 'IN_STOCK', input.reason);
  }

  findUnitBySerial(serial: string): Promise<UnitRecord | null> {
    return this.repository.findUnitBySerial(serial);
  }

  /**
   * Retour en rayon d'appareils vendus (retour en caisse) : chaque IMEI doit être vendu,
   * sur la variante attendue ; mouvement RETURN +1 par unité.
   */
  async returnSoldUnits(variantId: string, serials: readonly string[], reason: string): Promise<void> {
    await this.uow.run(async () => {
      for (const serial of serials) {
        const unit = await this.repository.findUnitBySerial(serial);
        if (!unit || unit.variantId !== variantId) throw new NotFoundError('Appareil', serial);
        if (unit.status !== 'SOLD') {
          throw new ValidationError('VALIDATION_FAILED', `L’appareil ${serial} n’est pas enregistré comme vendu`);
        }
        await this.moveUnit(unit.id, 'IN_STOCK', reason);
      }
    });
  }

  /** Correction d'une unité : l'IMEI ne change que tant qu'elle est en stock. */
  async updateUnit(unitId: string, input: UpdateUnitInput): Promise<StockUnitDto> {
    return this.uow.run(async () => {
      const unit = await this.repository.findUnit(unitId);
      if (!unit) throw new NotFoundError('Unité', unitId);
      if (input.serial !== undefined && input.serial !== unit.serial && unit.status !== 'IN_STOCK') {
        throw new ValidationError('VALIDATION_FAILED', 'L’IMEI d’une unité vendue ou sortie ne se modifie plus', { field: 'serial' });
      }
      return toUnitDto(await this.repository.updateUnit(unitId, input));
    });
  }

  /**
   * Passage d'articles au suivi à l'unité (ou l'inverse), quand leur catégorie change :
   * possible seulement sans stock, pour que stock = nombre d'unités reste vrai.
   */
  async setTracking(variantIds: readonly string[], tracksUnits: boolean): Promise<void> {
    await this.uow.run(async () => {
      const levels = await this.repository.getLevels(variantIds);
      const changing = [...levels.values()].filter((level) => level.tracksUnits !== tracksUnits);
      const stocked = changing.find((level) => level.onHand > 0 || level.reserved > 0);
      if (stocked) {
        throw new UnitTrackedVariantError(
          stocked.variantId,
          tracksUnits
            ? 'Passer au suivi à l’unité demande un stock à zéro : sortez d’abord le stock, puis saisissez les IMEI'
            : 'Quitter le suivi à l’unité demande un stock à zéro : sortez d’abord les unités en stock',
        );
      }
      await this.repository.setTracking(
        changing.map((level) => level.variantId),
        tracksUnits,
      );
    });
  }

  private async moveUnit(unitId: string, to: 'REMOVED' | 'IN_STOCK', reason: string): Promise<StockUnitDto> {
    return this.uow.run(async () => {
      const unit = await this.repository.findUnit(unitId);
      if (!unit) throw new NotFoundError('Unité', unitId);
      if (to === 'REMOVED' && unit.status !== 'IN_STOCK') {
        throw new ValidationError('VALIDATION_FAILED', 'Seule une unité en stock peut être sortie');
      }
      if (to === 'IN_STOCK' && unit.status === 'IN_STOCK') {
        throw new ValidationError('VALIDATION_FAILED', 'Cette unité est déjà en stock');
      }
      const result = await this.repository.moveUnit({ unit, to, reason, actorUserId: this.actor.userId });
      if (result === 'not_found') throw new NotFoundError('Stock de la variante', unit.variantId);
      if (result === 'below_reserved') throw new StockBelowReservedError(unit.variantId);
      await this.publishTransitions([result]);
      const updated = await this.repository.findUnit(unitId);
      if (!updated) throw new NotFoundError('Unité', unitId);
      return toUnitDto(updated);
    });
  }

  /** Règle 6 : pas d'ajustement libre sur une variante suivie à l'unité. */
  private async assertCounted(variantIds: readonly string[]): Promise<void> {
    const levels = await this.repository.getLevels(variantIds);
    const tracked = [...levels.values()].find((level) => level.tracksUnits);
    if (tracked) throw new UnitTrackedVariantError(tracked.variantId);
  }

  private async levelDto(variantId: string): Promise<InventoryLevelDto> {
    const level = (await this.repository.getLevels([variantId])).get(variantId);
    if (!level) throw new NotFoundError('Stock de la variante', variantId);
    return toLevelDto(level);
  }

  getLevels(variantIds: readonly string[]): Promise<Map<string, LevelState>> {
    return this.repository.getLevels(variantIds);
  }

  private async publishTransitions(changes: readonly LevelChange[]): Promise<void> {
    if (changes.length === 0) return;
    const storeId = this.actor.storeId;
    const { lowStockDefault } = await this.stores.getSettings(storeId);
    const now = this.clock.now();
    const events = changes.flatMap((change) =>
      stockTransitionEvents({ storeId, change, defaultThreshold: lowStockDefault, now }),
    );
    await this.outbox.addAll(events);
  }
}
