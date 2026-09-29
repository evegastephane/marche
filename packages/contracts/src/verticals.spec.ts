import { describe, expect, it } from 'vitest';
import { conditionDescription, conditionsFor, DEFAULT_VERTICAL_SETTINGS, storefrontServices, verticalSettingsSchema } from './verticals.js';

describe('Réglages propres au type de boutique', () => {
  it('les valeurs de départ passent le schéma', () => {
    expect(verticalSettingsSchema.safeParse(DEFAULT_VERTICAL_SETTINGS).success).toBe(true);
  });

  it('le site ne montre que les services activés et propres au type de boutique', () => {
    const settings = {
      ...DEFAULT_VERTICAL_SETTINGS,
      sizeExchange: { ...DEFAULT_VERTICAL_SETTINGS.sizeExchange, enabled: true },
      departments: { enabled: true },
      tradeIn: { ...DEFAULT_VERTICAL_SETTINGS.tradeIn, enabled: true },
      serialNumbers: { enabled: true },
    };
    const fashion = storefrontServices('FASHION', settings, ['FEMME', 'ENFANT']);
    expect(fashion).toMatchObject({
      sizeExchange: { days: 7 },
      madeToMeasure: null,
      tradeIn: null,
      warranty: null,
      serialNumbers: false,
      conditions: [],
    });
    expect(fashion.departments.map((d) => d.label)).toEqual(['Femme', 'Enfant']);

    const tech = storefrontServices('ELECTRONICS', settings);
    expect(tech).toMatchObject({ sizeExchange: null, departments: [], tradeIn: { text: expect.any(String) }, serialNumbers: true, returns: null });
    expect(tech.warranty).toEqual({ defaultMonths: 12, terms: '' });
    expect(tech.conditions.map((c) => c.value)).not.toContain('Occasion');
  });

  it('les rayons sans produit ne sont pas proposés, et rien sans le réglage', () => {
    expect(storefrontServices('FASHION', { departments: { enabled: true } }, []).departments).toEqual([]);
    expect(storefrontServices('FASHION', {}, ['FEMME']).departments).toEqual([]);
  });

  it('la boutique réécrit l’explication d’un état', () => {
    const settings = { conditions: [{ value: 'Neuf', description: 'Scellé, facture fournie.', enabled: true }] };
    expect(conditionDescription(settings, 'Neuf')).toBe('Scellé, facture fournie.');
    expect(conditionDescription(settings, 'Reconditionné – Bon')).toMatch(/Traces d’usage/);
    expect(conditionsFor(settings).map((c) => c.value)).toEqual(['Neuf']);
  });
});
