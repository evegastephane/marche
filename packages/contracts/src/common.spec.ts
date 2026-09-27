import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  CURRENCY_EXPONENT,
  moneySchema,
  paginated,
  paginationQuerySchema,
} from './common.js';
import { z } from 'zod';

describe('moneySchema', () => {
  it('accepte un montant entier en unités mineures', () => {
    expect(moneySchema.parse({ amount: 1990, currency: 'EUR' })).toEqual({
      amount: 1990,
      currency: 'EUR',
    });
  });

  it.each([19.9, -1])('refuse le montant %s', (amount) => {
    expect(moneySchema.safeParse({ amount, currency: 'EUR' }).success).toBe(false);
  });

  it('définit un nombre de décimales pour chaque devise', () => {
    for (const currency of CURRENCIES) {
      expect(CURRENCY_EXPONENT[currency]).toBeGreaterThanOrEqual(0);
    }
    expect(CURRENCY_EXPONENT.XOF).toBe(0);
  });
});

describe('paginationQuerySchema', () => {
  it('applique la limite par défaut', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('convertit la limite reçue en query string', () => {
    expect(paginationQuerySchema.parse({ limit: '50', cursor: 'abc' })).toEqual({
      limit: 50,
      cursor: 'abc',
    });
  });

  it('plafonne la limite à 100', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('paginated', () => {
  it('construit le schéma d’une page de résultats', () => {
    const page = paginated(z.object({ id: z.string() }));
    expect(page.parse({ items: [{ id: 'a' }], nextCursor: null })).toEqual({
      items: [{ id: 'a' }],
      nextCursor: null,
    });
  });
});
