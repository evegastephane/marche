import { Injectable } from '@nestjs/common';
import type { InventorySummaryDto } from '@marche/contracts';
import { InventoryService, type StockLine } from './application/inventory.service.js';
import { availableOf } from './domain/stock-policy.js';

/** API publique du module inventory (utilisée par catalog, orders, checkout, storefront). */
@Injectable()
export class InventoryFacade {
  constructor(private readonly inventory: InventoryService) {}

  initialize(entries: readonly StockLine[]): Promise<void> {
    return this.inventory.initialize(entries);
  }

  /** Lève InsufficientStockError (409) si une ligne ne peut pas être réservée. */
  reserve(lines: readonly StockLine[]): Promise<void> {
    return this.inventory.reserve(lines);
  }

  release(lines: readonly StockLine[]): Promise<void> {
    return this.inventory.release(lines);
  }

  commit(lines: readonly StockLine[], orderId: string): Promise<void> {
    return this.inventory.commit(lines, orderId);
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
}
