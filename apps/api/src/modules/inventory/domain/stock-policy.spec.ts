import { describe, expect, it } from 'vitest';
import { aggregateLines, type LevelChange, movementDelta, reasonRequired, stockTransitionEvents } from './stock-policy.js';

const now = new Date('2026-09-27T10:00:00Z');

const change = (before: number, after: number, threshold: number | null = null): LevelChange => ({
  variantId: 'v1',
  before: { onHand: before, reserved: 0 },
  after: { onHand: after, reserved: 0 },
  lowStockThreshold: threshold,
});

const types = (c: LevelChange, defaultThreshold = 5) =>
  stockTransitionEvents({ storeId: 's1', change: c, defaultThreshold, now }).map((e) => e.type);

describe('stockTransitionEvents', () => {
  it('n’émet rien sans franchissement de seuil', () => {
    expect(types(change(20, 15))).toEqual([]);
    expect(types(change(4, 3))).toEqual([]);
  });

  it('émet « stock bas » au franchissement du seuil (défaut boutique ou seuil propre)', () => {
    expect(types(change(6, 5))).toEqual(['inventory.stock.low']);
    expect(types(change(11, 10, 10))).toEqual(['inventory.stock.low']);
  });

  it('émet « rupture » puis « retour en stock »', () => {
    expect(types(change(3, 0))).toEqual(['inventory.stock.out']);
    expect(types(change(8, 0))).toEqual(['inventory.stock.low', 'inventory.stock.out']);
    expect(types(change(0, 4))).toEqual(['inventory.stock.back']);
  });
});

describe('movementDelta', () => {
  it('signe la quantité selon le type', () => {
    expect(movementDelta('RECEIPT', 5)).toBe(5);
    expect(movementDelta('RETURN', 1)).toBe(1);
    expect(movementDelta('LOSS', 2)).toBe(-2);
    expect(movementDelta('ADJUSTMENT', -3)).toBe(-3);
  });

  it('refuse une quantité nulle ou négative hors ajustement', () => {
    expect(() => movementDelta('RECEIPT', 0)).toThrow();
    expect(() => movementDelta('LOSS', -1)).toThrow();
  });

  it('exige un motif pour les pertes et ajustements', () => {
    expect(reasonRequired('LOSS')).toBe(true);
    expect(reasonRequired('ADJUSTMENT')).toBe(true);
    expect(reasonRequired('RECEIPT')).toBe(false);
  });
});

describe('aggregateLines', () => {
  it('regroupe par variante et trie (ordre stable, pas d’interblocage)', () => {
    expect(
      aggregateLines([
        { variantId: 'b', quantity: 1 },
        { variantId: 'a', quantity: 2 },
        { variantId: 'b', quantity: 3 },
      ]),
    ).toEqual([
      { variantId: 'a', quantity: 2 },
      { variantId: 'b', quantity: 4 },
    ]);
  });
});
