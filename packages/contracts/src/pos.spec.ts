import { describe, expect, it } from 'vitest';
import {
  allocatePayments,
  DEFAULT_POS_SETTINGS,
  enabledPaymentMethods,
  parsePosSettings,
  posDiscountAmount,
  posSaleSchema,
} from './pos.js';

describe('Caisse : encaissement', () => {
  it('rend la monnaie sur les espèces et ne garde que le prix', () => {
    const result = allocatePayments(7_500, [{ method: 'CASH', amount: 10_000 }]);
    expect(result).toEqual({
      ok: true,
      changeAmount: 2_500,
      paidAmount: 10_000,
      payments: [{ method: 'CASH', amount: 7_500, tenderedAmount: 10_000 }],
    });
  });

  it('combine Mobile Money et espèces, la monnaie ne sortant que des espèces', () => {
    const result = allocatePayments(25_000, [
      { method: 'MOBILE_MONEY', amount: 20_000, provider: 'Wave', reference: 'TX-1' },
      { method: 'CASH', amount: 10_000 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changeAmount).toBe(5_000);
    expect(result.payments).toEqual([
      { method: 'MOBILE_MONEY', amount: 20_000, tenderedAmount: null, provider: 'Wave', reference: 'TX-1' },
      { method: 'CASH', amount: 5_000, tenderedAmount: 10_000 },
    ]);
  });

  it('retire la monnaie du dernier versement en espèces, et oublie un versement entièrement rendu', () => {
    const result = allocatePayments(6_000, [
      { method: 'CASH', amount: 5_000 },
      { method: 'CASH', amount: 5_000 },
    ]);
    expect(result.ok && result.payments).toEqual([
      { method: 'CASH', amount: 5_000, tenderedAmount: 5_000 },
      { method: 'CASH', amount: 1_000, tenderedAmount: 5_000 },
    ]);
    const surplus = allocatePayments(1_000, [
      { method: 'CASH', amount: 1_000 },
      { method: 'CASH', amount: 2_000 },
    ]);
    expect(surplus.ok && surplus.payments).toEqual([{ method: 'CASH', amount: 1_000, tenderedAmount: 1_000 }]);
    expect(surplus.changeAmount).toBe(2_000);
  });

  it('refuse un paiement insuffisant, ou un paiement électronique au-delà du total', () => {
    expect(allocatePayments(10_000, [{ method: 'CASH', amount: 9_000 }])).toMatchObject({ ok: false, reason: 'INSUFFICIENT', missingAmount: 1_000 });
    expect(allocatePayments(10_000, [{ method: 'CARD', amount: 12_000 }])).toMatchObject({ ok: false, reason: 'NON_CASH_EXCEEDS' });
  });

  it('accepte un ticket entièrement offert sans paiement', () => {
    expect(allocatePayments(0, [])).toEqual({ ok: true, payments: [], changeAmount: 0, paidAmount: 0 });
  });
});

describe('Caisse : remise et réglages', () => {
  it('calcule une remise en pourcentage ou en montant, plafonnée au ticket', () => {
    expect(posDiscountAmount(45_000, { kind: 'PERCENT', value: 10 })).toBe(4_500);
    expect(posDiscountAmount(45_000, { kind: 'AMOUNT', value: 5_000 })).toBe(5_000);
    expect(posDiscountAmount(3_000, { kind: 'AMOUNT', value: 5_000 })).toBe(3_000);
    expect(posDiscountAmount(3_000, undefined)).toBe(0);
  });

  it('complète des réglages partiels ou abîmés avec les valeurs par défaut', () => {
    expect(parsePosSettings(null)).toEqual(DEFAULT_POS_SETTINGS);
    expect(parsePosSettings({ staffDiscountMaxPercent: 15, receiptWidth: '42', acceptCard: 'oui' })).toEqual({
      ...DEFAULT_POS_SETTINGS,
      staffDiscountMaxPercent: 15,
    });
  });

  it('propose les moyens de paiement activés', () => {
    expect(enabledPaymentMethods(DEFAULT_POS_SETTINGS)).toEqual(['CASH', 'MOBILE_MONEY', 'CARD', 'OTHER']);
    expect(enabledPaymentMethods({ ...DEFAULT_POS_SETTINGS, mobileMoneyProviders: [], acceptCard: false })).toEqual(['CASH', 'OTHER']);
  });

  it('exige au moins un article et un opérateur pour le Mobile Money', () => {
    const base = { sessionId: '01a0f570-860b-71f1-a9e7-690a761d715b' };
    expect(posSaleSchema.safeParse({ ...base, payments: [] }).success).toBe(false);
    const parsed = posSaleSchema.safeParse({
      ...base,
      customLines: [{ title: 'Divers', unitPriceAmount: 1000, quantity: 1 }],
      payments: [{ method: 'MOBILE_MONEY', amount: 1000 }],
    });
    expect(parsed.success).toBe(false);
  });
});
