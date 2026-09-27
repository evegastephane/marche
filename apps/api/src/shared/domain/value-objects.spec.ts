import { describe, expect, it } from 'vitest';
import { AggregateRoot } from './aggregate-root.js';
import { createEvent } from './domain-event.js';
import { ValidationError } from './domain-error.js';
import { Email } from './email.vo.js';
import { Money } from './money.vo.js';
import { Slug } from './slug.vo.js';

const normalize = (value: string) => value.replace(/[  ]/g, ' ');

describe('Money', () => {
  it('additionne et multiplie en unités mineures', () => {
    const price = Money.of(1990, 'EUR');
    expect(price.times(3).add(Money.of(500, 'EUR')).amount).toBe(6470);
  });

  it.each([19.9, -1, Number.MAX_SAFE_INTEGER + 1])('refuse le montant %s', (amount) => {
    expect(() => Money.of(amount, 'EUR')).toThrow(ValidationError);
  });

  it('refuse de mélanger les devises', () => {
    expect(() => Money.of(100, 'EUR').add(Money.of(100, 'XOF'))).toThrow(/Devises incompatibles/);
  });

  it('formate selon les décimales de la devise', () => {
    expect(normalize(Money.of(2_500_000, 'XOF').format())).toBe('2 500 000 F CFA');
    expect(normalize(Money.of(1990, 'EUR').format())).toBe('19,90 €');
  });
});

describe('Slug', () => {
  it('dérive un slug lisible d’un texte accentué', () => {
    expect(Slug.fromText('  Robe d’été : Été 2026 ! ').value).toBe('robe-d-ete-ete-2026');
  });

  it('ajoute un suffixe sans dépasser 100 caractères', () => {
    const long = Slug.fromText('a'.repeat(120));
    expect(long.value).toHaveLength(100);
    expect(long.withSuffix(12).value).toMatch(/^a+-12$/);
    expect(long.withSuffix(12).value.length).toBeLessThanOrEqual(100);
  });

  it('normalise la casse et les espaces', () => {
    expect(Slug.of('  Majuscules ').value).toBe('majuscules');
  });

  it.each(['', 'double--tiret', '-bord', 'avec espace'])('refuse « %s »', (value) => {
    expect(() => Slug.of(value)).toThrow(ValidationError);
  });
});

describe('Email', () => {
  it('normalise en minuscules', () => {
    expect(Email.of(' Awa@Example.COM ').value).toBe('awa@example.com');
  });

  it('refuse une adresse invalide', () => {
    expect(() => Email.of('pas-une-adresse')).toThrow(ValidationError);
  });
});

describe('AggregateRoot', () => {
  class Thing extends AggregateRoot {
    constructor() {
      super('thing-1');
    }

    touch() {
      this.record(createEvent('test.thing.touched', 'store-1', this.id, { ok: true }));
    }
  }

  it('accumule puis vide les événements', () => {
    const thing = new Thing();
    thing.touch();
    thing.touch();
    const events = thing.pullEvents();
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'test.thing.touched', storeId: 'store-1', aggregateId: 'thing-1' });
    expect(thing.pullEvents()).toEqual([]);
  });

  it('incrémente la version après une écriture', () => {
    const thing = new Thing();
    thing.markPersisted();
    expect(thing.version).toBe(1);
  });
});
