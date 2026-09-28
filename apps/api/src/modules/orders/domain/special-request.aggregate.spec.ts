import { describe, expect, it } from 'vitest';
import { InvalidRequestTransitionError, SpecialRequest } from './special-request.aggregate.js';

const now = new Date('2026-09-28T10:00:00Z');

function submitted() {
  return SpecialRequest.submit(
    {
      storeId: 's1',
      productId: 'p1',
      productTitle: 'iPhone 12',
      productSlug: 'iphone-12',
      options: [
        { name: 'Stockage', value: '256 Go' },
        { name: 'Couleur', value: 'Violet' },
      ],
      quantity: 1,
      firstName: 'Awa',
      lastName: null,
      email: 'awa@example.com',
      phone: '+221770000000',
      note: null,
      currency: 'XOF',
    },
    now,
  );
}

describe('SpecialRequest : cycle de vie', () => {
  it('reçue, elle prévient la boutique', () => {
    const request = submitted();
    expect(request.status).toBe('NEW');
    expect(request.configurationLabel).toBe('256 Go / Violet');
    expect(request.pullEvents()[0]).toMatchObject({ type: 'orders.special-request.received' });
  });

  it('chiffrée puis convertie une seule fois', () => {
    const request = submitted();
    request.quote({ unitPriceAmount: 350_000, delay: '5 jours' }, now);
    request.quote({ unitPriceAmount: 340_000, delay: '4 jours' }, now);
    expect(request.snapshot()).toMatchObject({ status: 'QUOTED', quotedUnitPriceAmount: 340_000, quotedDelay: '4 jours' });
    request.convert('o1', now);
    expect(request.snapshot()).toMatchObject({ status: 'CONVERTED', orderId: 'o1' });
    expect(() => request.convert('o2', now)).toThrow(InvalidRequestTransitionError);
    expect(() => request.decline('trop tard', now)).toThrow(InvalidRequestTransitionError);
  });

  it('ne se convertit pas sans devis', () => {
    expect(() => submitted().convert('o1', now)).toThrow(InvalidRequestTransitionError);
  });

  it('refusée, elle ne se chiffre plus', () => {
    const request = submitted();
    request.decline('Modèle introuvable', now);
    expect(request.snapshot()).toMatchObject({ status: 'DECLINED', declineReason: 'Modèle introuvable' });
    expect(() => request.quote({ unitPriceAmount: 1, delay: 'demain' }, now)).toThrow(InvalidRequestTransitionError);
  });
});
