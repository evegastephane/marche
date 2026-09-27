import { Injectable } from '@nestjs/common';
import type {
  AdjustStockInput,
  InsufficientStockDetail,
  InventoryItemDto,
  InventoryLevelDto,
  InventoryListQuery,
  Paginated,
  StockMovementDto,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
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
} from '../domain/stock-policy.js';
import { InventoryReadModel, InventoryRepository, type LevelState } from './inventory.ports.js';

export interface StockLine {
  variantId: string;
  quantity: number;
}

function toLevelDto(state: LevelState): InventoryLevelDto {
  return {
    variantId: state.variantId,
    onHand: state.onHand,
    reserved: state.reserved,
    available: availableOf(state),
    lowStockThreshold: state.lowStockThreshold,
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

  /** Stock initial des nouvelles variantes (mouvement INITIAL si la quantité est positive). */
  initialize(entries: readonly StockLine[]): Promise<void> {
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

  /** Expédition : le stock réservé quitte l'entrepôt (mouvement SALE). */
  async commit(lines: readonly StockLine[], orderId: string): Promise<void> {
    await this.uow.run(async () => {
      const changes: LevelChange[] = [];
      for (const line of aggregateLines(lines)) {
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
