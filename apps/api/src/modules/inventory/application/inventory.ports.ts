import type {
  InventoryItemDto,
  InventoryListQuery,
  Paginated,
  StockMovementDto,
  StockMovementType,
  StockUnitDto,
  StockUnitStatus,
  UnitCondition,
  UnitListQuery,
} from '@marche/contracts';
import type { LevelChange, StockSnapshot } from '../domain/stock-policy.js';

export interface LevelState extends StockSnapshot {
  variantId: string;
  lowStockThreshold: number | null;
  /** Suivi à l'unité (IMEI) : stock = nombre d'unités en stock. */
  tracksUnits: boolean;
  updatedAt: Date;
}

export type AdjustResult = LevelChange | 'not_found' | 'below_reserved';

/** Unité saisie : IMEI ou numéro de série déjà normalisé. */
export interface UnitEntry {
  serial: string;
  batteryHealth?: number | null;
  notes?: string | null;
}

/** Stock initial d'une nouvelle variante : une quantité, ou des unités identifiées. */
export interface InitialStock {
  variantId: string;
  quantity: number;
  tracksUnits?: boolean;
  condition?: UnitCondition;
  units?: readonly UnitEntry[];
}

export interface UnitRecord {
  id: string;
  variantId: string;
  serial: string;
  condition: UnitCondition;
  batteryHealth: number | null;
  status: StockUnitStatus;
  notes: string | null;
  orderLineId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Unités vendues par une ligne de commande expédiée (variante suivie à l'unité). */
export interface SoldUnits {
  serials: readonly string[];
  orderLineId: string | null;
}

/**
 * Écritures atomiques sur le stock : l'adapter garantit la cohérence en concurrence
 * (verrous, UPDATE conditionnels, contraintes et déclencheurs du journal), le domaine décide des
 * règles et des événements.
 */
export abstract class InventoryRepository {
  abstract initialize(entries: readonly InitialStock[], actorUserId: string | null): Promise<void>;
  /** Réserve si le disponible suffit ; null sinon. */
  abstract tryReserve(variantId: string, quantity: number): Promise<LevelChange | null>;
  abstract release(variantId: string, quantity: number): Promise<LevelChange>;
  /** Expédition : lève la réservation et sort le stock (les unités vendues passent SOLD). */
  abstract commit(variantId: string, quantity: number, orderId: string, units?: SoldUnits): Promise<LevelChange>;
  abstract adjust(input: {
    variantId: string;
    delta: number;
    type: StockMovementType;
    reason: string | null;
    actorUserId: string | null;
  }): Promise<AdjustResult>;
  /** Entrée d'unités : une unité et un mouvement +1 par IMEI. Lève SerialTakenError. */
  abstract receiveUnits(input: {
    variantId: string;
    units: readonly UnitEntry[];
    condition: UnitCondition;
    type: 'RECEIPT' | 'RETURN';
    reason: string | null;
    actorUserId: string | null;
  }): Promise<LevelChange | 'not_found'>;
  abstract findUnit(unitId: string): Promise<UnitRecord | null>;
  /** Sortie (REMOVED, mouvement LOSS −1) ou retour en stock (IN_STOCK, mouvement RETURN +1) d'une unité. */
  abstract moveUnit(input: {
    unit: UnitRecord;
    to: 'REMOVED' | 'IN_STOCK';
    reason: string;
    actorUserId: string | null;
  }): Promise<AdjustResult>;
  /** Correction d'une unité (IMEI, batterie, notes). Lève SerialTakenError. */
  abstract updateUnit(unitId: string, patch: { serial?: string; batteryHealth?: number | null; notes?: string | null }): Promise<UnitRecord>;
  abstract setTracking(variantIds: readonly string[], tracksUnits: boolean): Promise<void>;
  abstract setThreshold(variantId: string, threshold: number | null): Promise<boolean>;
  abstract getLevels(variantIds: readonly string[]): Promise<Map<string, LevelState>>;
}

export abstract class InventoryReadModel {
  abstract list(query: InventoryListQuery, defaultThreshold: number): Promise<Paginated<InventoryItemDto>>;
  abstract movements(variantId: string, cursor: string | undefined, limit: number): Promise<Paginated<StockMovementDto>>;
  abstract units(variantId: string, query: UnitListQuery): Promise<Paginated<StockUnitDto>>;
  /** Numéros déjà enregistrés dans la boutique : numéro → variante. */
  abstract knownSerials(serials: readonly string[]): Promise<Map<string, string>>;
}
