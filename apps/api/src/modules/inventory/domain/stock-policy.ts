import type { AdjustableMovementType, InsufficientStockDetail } from '@marche/contracts';
import { createEvent, type DomainEvent } from '../../../shared/domain/domain-event.js';
import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';

export interface StockSnapshot {
  onHand: number;
  reserved: number;
}

export interface LevelChange {
  variantId: string;
  before: StockSnapshot;
  after: StockSnapshot;
  /** Seuil propre à la variante (null : seuil par défaut de la boutique). */
  lowStockThreshold: number | null;
}

/** R4 : disponible = en main − réservé. */
export function availableOf(stock: StockSnapshot): number {
  return stock.onHand - stock.reserved;
}

/** Variation de « en main » d'un mouvement saisi par le marchand (UC-20). */
export function movementDelta(type: AdjustableMovementType, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new ValidationError('VALIDATION_FAILED', 'La quantité doit être un entier non nul');
  }
  switch (type) {
    case 'RECEIPT':
    case 'RETURN':
      if (quantity < 0) throw new ValidationError('VALIDATION_FAILED', 'Quantité positive attendue');
      return quantity;
    case 'LOSS':
      if (quantity < 0) throw new ValidationError('VALIDATION_FAILED', 'Quantité positive attendue');
      return -quantity;
    case 'ADJUSTMENT':
      return quantity;
  }
}

export function reasonRequired(type: AdjustableMovementType): boolean {
  return type === 'LOSS' || type === 'ADJUSTMENT';
}

/**
 * Événements émis au franchissement d'un seuil (pas à chaque mouvement) :
 * stock bas, rupture, retour en stock.
 */
export function stockTransitionEvents(input: {
  storeId: string;
  change: LevelChange;
  defaultThreshold: number;
  now: Date;
}): DomainEvent[] {
  const { storeId, change, now } = input;
  const threshold = change.lowStockThreshold ?? input.defaultThreshold;
  const before = availableOf(change.before);
  const after = availableOf(change.after);
  const payload = { variantId: change.variantId, available: after, threshold };
  const events: DomainEvent[] = [];
  if (before > threshold && after <= threshold) {
    events.push(createEvent('inventory.stock.low', storeId, change.variantId, payload, now));
  }
  if (before > 0 && after <= 0) {
    events.push(createEvent('inventory.stock.out', storeId, change.variantId, payload, now));
  }
  if (before <= 0 && after > 0) {
    events.push(createEvent('inventory.stock.back', storeId, change.variantId, payload, now));
  }
  return events;
}

/** R5 : la réservation échoue en bloc ; le détail liste chaque ligne manquante. */
export class InsufficientStockError extends ConflictError {
  constructor(readonly lines: InsufficientStockDetail[]) {
    super(
      'INSUFFICIENT_STOCK',
      lines.length === 1
        ? 'Stock insuffisant pour un article de la commande'
        : `Stock insuffisant pour ${lines.length} articles de la commande`,
      { lines },
    );
  }
}

export class StockBelowReservedError extends ConflictError {
  constructor(variantId: string) {
    super(
      'STOCK_BELOW_RESERVED',
      'Impossible : le stock en main deviendrait inférieur au stock réservé par des commandes en cours',
      { variantId },
    );
  }
}

/** Regroupe les quantités par variante et trie les lignes (ordre stable = pas d'interblocage). */
export function aggregateLines(
  lines: readonly { variantId: string; quantity: number }[],
): { variantId: string; quantity: number }[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Quantité invalide');
    }
    totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}
