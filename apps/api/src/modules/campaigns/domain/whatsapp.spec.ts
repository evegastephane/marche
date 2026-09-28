import { describe, expect, it } from 'vitest';
import { isOptOutMessage, nextStatus, phoneSuffix, toWhatsAppNumber } from './whatsapp.js';

describe('toWhatsAppNumber', () => {
  it('garde un numéro international et retire le « + » et les espaces', () => {
    expect(toWhatsAppNumber('+221 77 000 00 00', 'SN')).toBe('221770000000');
    expect(toWhatsAppNumber('00221770000000', 'CI')).toBe('221770000000');
  });

  it('ajoute l’indicatif du pays de la boutique à un numéro national', () => {
    expect(toWhatsAppNumber('77 000 00 00', 'SN')).toBe('221770000000');
    expect(toWhatsAppNumber('06 12 34 56 78', 'FR')).toBe('33612345678');
  });

  it('ne double pas un indicatif déjà présent sans « + »', () => {
    expect(toWhatsAppNumber('221770000000', 'SN')).toBe('221770000000');
  });

  it('refuse un numéro inexploitable', () => {
    expect(toWhatsAppNumber('abc', 'SN')).toBeNull();
    expect(toWhatsAppNumber('12', 'SN')).toBeNull();
    expect(toWhatsAppNumber('770000000', 'ZZ')).toBeNull();
  });
});

describe('nextStatus', () => {
  it('ne recule jamais', () => {
    expect(nextStatus('READ', 'DELIVERED')).toBe('READ');
    expect(nextStatus('SENT', 'READ')).toBe('READ');
  });

  it('un échec n’écrase pas un message déjà délivré', () => {
    expect(nextStatus('SENT', 'FAILED')).toBe('FAILED');
    expect(nextStatus('DELIVERED', 'FAILED')).toBe('DELIVERED');
  });
});

describe('isOptOutMessage', () => {
  it('reconnaît STOP et ses variantes françaises', () => {
    for (const text of ['STOP', 'stop.', ' Arrêt ', 'ARRETER']) expect(isOptOutMessage(text)).toBe(true);
    expect(isOptOutMessage('Je veux la taille M')).toBe(false);
  });
});

it('phoneSuffix compare les 9 derniers chiffres', () => {
  expect(phoneSuffix('+221 77 000 00 00')).toBe('770000000');
});
