import { describe, expect, it } from 'vitest';
import {
  addressSchema,
  adjustStockSchema,
  availabilityQuerySchema,
  checkoutSchema,
  createDraftOrderSchema,
  createProductSchema,
  defaultTemplateSettings,
  getTemplate,
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
  it('applique les valeurs par défaut', () => {
    const product = createProductSchema.parse({
      title: 'T-shirt',
      variants: [{ sku: 'TS-01', priceAmount: 1500 }],
    });
    expect(product.options).toEqual([]);
    expect(product.mediaIds).toEqual([]);
    expect(product.variants[0]).toMatchObject({ optionValues: [], trackInventory: true });
  });

  it('refuse un produit sans variante et un SKU invalide', () => {
    expect(createProductSchema.safeParse({ title: 'X', variants: [] }).success).toBe(false);
    expect(
      createProductSchema.safeParse({ title: 'X', variants: [{ sku: 'a b', priceAmount: 1 }] })
        .success,
    ).toBe(false);
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
});

describe('availabilityQuerySchema', () => {
  it('découpe la liste d’identifiants', () => {
    expect(availabilityQuerySchema.parse({ variantIds: `${uuid(1)}, ${uuid(2)}` }).variantIds).toEqual(
      [uuid(1), uuid(2)],
    );
  });
});
