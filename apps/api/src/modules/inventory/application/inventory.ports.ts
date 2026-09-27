import type {
  InventoryItemDto,
  InventoryListQuery,
  Paginated,
  StockMovementDto,
  StockMovementType,
} from '@marche/contracts';
import type { LevelChange, StockSnapshot } from '../domain/stock-policy.js';

export interface LevelState extends StockSnapshot {
  variantId: string;
  lowStockThreshold: number | null;
  updatedAt: Date;
}

export type AdjustResult = LevelChange | 'not_found' | 'below_reserved';

/**
 * Écritures atomiques sur le stock : l'adapter garantit la cohérence en concurrence
 * (UPDATE conditionnels + contrainte CHECK), le domaine décide des règles et des événements.
 */
export abstract class InventoryRepository {
  abstract initialize(
    entries: readonly { variantId: string; quantity: number }[],
    actorUserId: string | null,
  ): Promise<void>;
  /** Réserve si le disponible suffit ; null sinon. */
  abstract tryReserve(variantId: string, quantity: number): Promise<LevelChange | null>;
  abstract release(variantId: string, quantity: number): Promise<LevelChange>;
  abstract commit(variantId: string, quantity: number, orderId: string): Promise<LevelChange>;
  abstract adjust(input: {
    variantId: string;
    delta: number;
    type: StockMovementType;
    reason: string | null;
    actorUserId: string | null;
  }): Promise<AdjustResult>;
  abstract setThreshold(variantId: string, threshold: number | null): Promise<boolean>;
  abstract getLevels(variantIds: readonly string[]): Promise<Map<string, LevelState>>;
}

export abstract class InventoryReadModel {
  abstract list(query: InventoryListQuery, defaultThreshold: number): Promise<Paginated<InventoryItemDto>>;
  abstract movements(
    variantId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<Paginated<StockMovementDto>>;
}
