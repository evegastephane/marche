import { describe, expect, it } from 'vitest';
import { createStoreSchema, storeSlugSchema, updateStoreSchema } from './stores.js';

describe('storeSlugSchema', () => {
  it.each(['ma-boutique', 'abc', 'boutique2026', 'a1b'])('accepte « %s »', (slug) => {
    expect(storeSlugSchema.safeParse(slug).success).toBe(true);
  });

  it('normalise en minuscules et retire les espaces', () => {
    expect(storeSlugSchema.parse('  Ma-Boutique ')).toBe('ma-boutique');
  });

  it.each([
    ['ab', 'trop court'],
    ['a'.repeat(41), 'trop long'],
    ['-boutique', 'tiret en début'],
    ['boutique-', 'tiret en fin'],
    ['ma--boutique', 'double tiret'],
    ['ma_boutique', 'caractère interdit'],
    ['boutique.fr', 'point interdit'],
  ])('refuse « %s » (%s)', (slug) => {
    expect(storeSlugSchema.safeParse(slug).success).toBe(false);
  });

  it.each(['www', 'app', 'api', 'admin'])('refuse le sous-domaine réservé « %s »', (slug) => {
    const result = storeSlugSchema.safeParse(slug);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Cette adresse est réservée');
  });
});

describe('createStoreSchema', () => {
  it('valide une boutique complète et normalise le pays', () => {
    const input = createStoreSchema.parse({
      name: 'Chez Awa',
      slug: 'chez-awa',
      currency: 'XOF',
      country: 'sn',
      timezone: 'Africa/Dakar',
    });
    expect(input).toEqual({
      name: 'Chez Awa',
      slug: 'chez-awa',
      currency: 'XOF',
      country: 'SN',
      timezone: 'Africa/Dakar',
    });
  });

  it('refuse une devise non supportée et un fuseau inconnu', () => {
    const result = createStoreSchema.safeParse({
      name: 'Test',
      slug: 'test',
      currency: 'BTC',
      country: 'FR',
      timezone: 'Mars/Olympus',
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['currency', 'timezone']));
  });
});

describe('updateStoreSchema', () => {
  it('accepte une mise à jour partielle', () => {
    expect(updateStoreSchema.parse({ phone: '+221 77 000 00 00' })).toEqual({
      phone: '+221 77 000 00 00',
    });
  });

  it('refuse une mise à jour vide', () => {
    expect(updateStoreSchema.safeParse({}).success).toBe(false);
  });
});
