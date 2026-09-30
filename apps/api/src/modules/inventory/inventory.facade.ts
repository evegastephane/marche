import { Injectable } from '@nestjs/common';
import type { AdjustStockInput, InventoryLevelDto, InventorySummaryDto, ReceiveUnitsInput } from '@marche/contracts';
import type { InitialStock } from './application/inventory.ports.js';
import { InventoryService, type ShippedLine, type StockLine } from './application/inventory.service.js';
import { availableOf } from './domain/stock-policy.js';

export type { InitialStock } from './application/inventory.ports.js';
export type { ShippedLine } from './application/inventory.service.js';

/** API publique du module inventory (utilisée par catalog, orders, checkout, storefront). */
@Injectable()
export class InventoryFacade {
  constructor(private readonly inventory: InventoryService) {}

  /** Stock initial de nouvelles variantes : quantité, ou unités identifiées (IMEI). */
  initialize(entries: readonly InitialStock[]): Promise<void> {
    return this.inventory.initialize(entries);
  }

  /** Lève InsufficientStockError (409) si une ligne ne peut pas être réservée. */
  reserve(lines: readonly StockLine[]): Promise<void> {
    return this.inventory.reserve(lines);
  }

  release(lines: readonly StockLine[]): Promise<void> {
    return this.inventory.release(lines);
  }

  /** Expédition ; une variante suivie à l'unité exige les IMEI des pièces expédiées. */
  commit(lines: readonly ShippedLine[], orderId: string): Promise<void> {
    return this.inventory.commit(lines, orderId);
  }

  /** Passage au suivi à l'unité (ou l'inverse) de variantes sans stock. */
  setTracking(variantIds: readonly string[], tracksUnits: boolean): Promise<void> {
    return this.inventory.setTracking(variantIds, tracksUnits);
  }

  /** Variantes suivies à l'unité parmi celles demandées. */
  async trackedVariants(variantIds: readonly string[]): Promise<Set<string>> {
    const levels = await this.inventory.getLevels(variantIds);
    return new Set([...levels.values()].filter((level) => level.tracksUnits).map((level) => level.variantId));
  }

  async summaries(variantIds: readonly string[]): Promise<Map<string, InventorySummaryDto>> {
    const levels = await this.inventory.getLevels(variantIds);
    return new Map(
      [...levels.values()].map((level) => [
        level.variantId,
        { onHand: level.onHand, reserved: level.reserved, available: availableOf(level) },
      ]),
    );
  }

  /** Disponible par variante (les variantes sans niveau de stock sont absentes). */
  async availability(variantIds: readonly string[]): Promise<Map<string, number>> {
    const levels = await this.inventory.getLevels(variantIds);
    return new Map([...levels.values()].map((level) => [level.variantId, Math.max(availableOf(level), 0)]));
  }

  /** Mouvement de stock libre (import : stock ramené à la valeur du fichier). */
  adjust(variantId: string, input: AdjustStockInput): Promise<InventoryLevelDto> {
    return this.inventory.adjust(variantId, input);
  }

  /** Numéros (IMEI) déjà enregistrés dans la boutique : numéro → variante. */
  knownSerials(serials: readonly string[]): Promise<Map<string, string>> {
    return this.inventory.knownSerials(serials);
  }

  /** Réception d'unités (IMEI) sur une variante suivie à l'unité. */
  receiveUnits(variantId: string, input: ReceiveUnitsInput): Promise<InventoryLevelDto> {
    return this.inventory.receiveUnits(variantId, input);
  }
}
