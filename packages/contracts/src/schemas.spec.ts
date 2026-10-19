import { describe, expect, it } from 'vitest';
import {
  ADDABLE_SECTION_TYPES,
  addressSchema,
  adjustStockSchema,
  answeredFaqItems,
  availabilityQuerySchema,
  checkoutSchema,
  createDraftOrderSchema,
  createProductSchema,
  defaultTemplateSettings,
  getTemplate,
  newSection,
  sectionAddBlocker,
  setCollectionProductsSchema,
  shippingSettingsSchema,
  themeSettingsBaseSchema,
} from './index.js';

const uuid = (n: number) => `0190f3a0-0000-7000-8000-${String(n).padStart(12, '0')}`;

describe('adjustStockSchema', () => {
  it('accepte une réception positive sans motif', () => {
    expect(adjustStockSchema.safeParse({ type: 'RECEIPT', quantity: 10 }).success).toBe(true);
  });

  it('accepte un ajustement négatif avec motif', () => {
    expect(
      adjustStockSchema.safeParse({ type: 'ADJUSTMENT', quantity: -3, reason: 'Inventaire' }).success,
    ).toBe(true);
  });

  it.each([
    [{ type: 'RECEIPT', quantity: 0 }, 'quantity'],
    [{ type: 'LOSS', quantity: -2, reason: 'Casse' }, 'quantity'],
    [{ type: 'LOSS', quantity: 2 }, 'reason'],
    [{ type: 'ADJUSTMENT', quantity: 5 }, 'reason'],
  ])('refuse %o (champ %s)', (input, path) => {
    const result = adjustStockSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain(path);
  });
});

describe('createProductSchema', () => {
  it('applique les valeurs par défaut et met la référence en majuscules', () => {
    const product = createProductSchema.parse({
      title: 'T-shirt',
      categoryId: uuid(1),
      reference: ' ts-01 ',
      variants: [{ sku: 'TS-01', priceAmount: 1500 }],
    });
    expect(product.reference).toBe('TS-01');
    expect(product.specs).toEqual({});
    expect(product.mediaIds).toEqual([]);
    expect(product.variants[0]).toMatchObject({ options: {}, trackInventory: true });
  });

  it('refuse un produit sans catégorie, sans variante ou avec un SKU invalide', () => {
    const base = { title: 'X', categoryId: uuid(1) };
    expect(createProductSchema.safeParse({ title: 'X', variants: [{ sku: 'X-1', priceAmount: 1 }] }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, variants: [] }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, variants: [{ sku: 'a b', priceAmount: 1 }] }).success).toBe(false);
  });
});

describe('setCollectionProductsSchema', () => {
  it('refuse un produit en double', () => {
    expect(setCollectionProductsSchema.safeParse({ productIds: [uuid(1), uuid(1)] }).success).toBe(
      false,
    );
  });
});

describe('createDraftOrderSchema', () => {
  it('normalise l’e-mail du client et refuse une variante en double', () => {
    expect(
      createDraftOrderSchema.parse({ customer: { email: 'Awa@Example.com' } }).customer?.email,
    ).toBe('awa@example.com');
    expect(
      createDraftOrderSchema.safeParse({
        lines: [
          { variantId: uuid(1), quantity: 1 },
          { variantId: uuid(1), quantity: 2 },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('checkoutSchema et addressSchema', () => {
  const address = {
    firstName: 'Awa',
    lastName: 'Diop',
    line1: '12 rue des Almadies',
    city: 'Dakar',
    country: 'sn',
  };

  it('valide une adresse et normalise le pays', () => {
    expect(addressSchema.parse(address).country).toBe('SN');
  });

  it('valide un checkout invité', () => {
    expect(
      checkoutSchema.safeParse({ cartId: uuid(9), email: 'awa@example.com', shippingAddress: address })
        .success,
    ).toBe(true);
  });
});

describe('shippingSettingsSchema', () => {
  it('distingue les stratégies de livraison', () => {
    expect(
      shippingSettingsSchema.safeParse({ strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 500 })
        .success,
    ).toBe(false);
    expect(
      shippingSettingsSchema.safeParse({
        strategy: 'FREE_OVER_THRESHOLD',
        flatRateAmount: 500,
        thresholdAmount: 5000,
      }).success,
    ).toBe(true);
  });
});

describe('templates', () => {
  it('le preset par défaut respecte le schéma de son template', () => {
    const template = getTemplate('default');
    expect(template).toBeDefined();
    expect(template?.settingsSchema.safeParse(defaultTemplateSettings).success).toBe(true);
  });

  it('refuse deux sections avec le même identifiant et un lien non sûr', () => {
    const duplicated = {
      ...defaultTemplateSettings,
      sections: [defaultTemplateSettings.sections[0], defaultTemplateSettings.sections[0]],
    };
    expect(themeSettingsBaseSchema.safeParse(duplicated).success).toBe(false);

    const unsafeLink = {
      ...defaultTemplateSettings,
      sections: [{ id: 'hero', type: 'hero', title: 'X', ctaHref: 'javascript:alert(1)' }],
    };
    expect(themeSettingsBaseSchema.safeParse(unsafeLink).success).toBe(false);
  });

  it('retourne undefined pour un template inconnu', () => {
    expect(getTemplate('inconnu')).toBeUndefined();
  });

  it('refuse une seconde bannière ou une seconde section contact', () => {
    const contact = newSection('contact', []);
    const twoContacts = {
      ...defaultTemplateSettings,
      sections: [...defaultTemplateSettings.sections, contact, { ...contact, id: 'contact-2' }],
    };
    expect(themeSettingsBaseSchema.safeParse(twoContacts).success).toBe(false);
    const oneContact = { ...defaultTemplateSettings, sections: [...defaultTemplateSettings.sections, contact] };
    expect(themeSettingsBaseSchema.safeParse(oneContact).success).toBe(true);
  });
});

describe('newSection', () => {
  it('donne un identifiant libre et des réglages valides pour chaque type proposé', () => {
    let sections = [...defaultTemplateSettings.sections];
    for (const type of ADDABLE_SECTION_TYPES) {
      if (sectionAddBlocker(sections, type)) continue;
      const section = newSection(type, sections, 'Chez Awa');
      expect(sections.some((s) => s.id === section.id), type).toBe(false);
      sections = [...sections, section];
    }
    const parsed = themeSettingsBaseSchema.safeParse({ ...defaultTemplateSettings, sections });
    expect(parsed.success).toBe(true);
    expect(sections.filter((s) => s.type === 'faq')).toHaveLength(1);
    expect(newSection('faq', sections).id).toBe('faq-2');
  });

  it('bloque la seconde bannière et explique pourquoi', () => {
    expect(sectionAddBlocker(defaultTemplateSettings.sections, 'hero')).toMatch(/bannière/);
    expect(sectionAddBlocker(defaultTemplateSettings.sections, 'faq')).toBeNull();
  });

  it('suggère des questions sans réponse, qui restent hors du site', () => {
    const faq = newSection('faq', []);
    expect(faq.type === 'faq' && answeredFaqItems(faq)).toEqual([]);
    expect(newSection('hero', [], 'Chez Awa')).toMatchObject({ title: 'Bienvenue chez Awa' });
  });
});

describe('availabilityQuerySchema', () => {
  it('découpe la liste d’identifiants', () => {
    expect(availabilityQuerySchema.parse({ variantIds: `${uuid(1)}, ${uuid(2)}` }).variantIds).toEqual(
      [uuid(1), uuid(2)],
    );
  });
});
