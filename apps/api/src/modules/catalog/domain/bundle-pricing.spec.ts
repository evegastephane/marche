import { describe, expect, it } from 'vitest';
import { packDiscount, priceBundles, type PricingBundle } from './bundle-pricing.js';

const phonePack: PricingBundle = {
  id: 'b1',
  title: 'Pack iPhone 12 + chargeur',
  anchorProductId: 'phone',
  itemProductIds: ['charger'],
  discountType: 'PERCENT',
  discountValue: 10,
};

describe('packDiscount', () => {
  it('applique un pourcentage arrondi à l’unité mineure', () => {
    expect(packDiscount({ discountType: 'PERCENT', discountValue: 10 }, [300_000, 15_005])).toBe(31_501);
  });

  it('plafonne un montant fixe au total des articles', () => {
    expect(packDiscount({ discountType: 'AMOUNT', discountValue: 50_000 }, [20_000, 10_000])).toBe(30_000);
  });
});

describe('priceBundles', () => {
  it('ne remise rien si un accessoire du pack manque', () => {
    expect(priceBundles([phonePack], [{ productId: 'phone', unitPriceAmount: 300_000, quantity: 1 }])).toEqual([]);
  });

  it('applique le pack autant de fois que les quantités le permettent', () => {
    const discounts = priceBundles(
      [phonePack],
      [
        { productId: 'phone', unitPriceAmount: 300_000, quantity: 2 },
        { productId: 'charger', unitPriceAmount: 15_000, quantity: 3 },
      ],
    );
    expect(discounts).toEqual([{ bundleId: 'b1', title: phonePack.title, quantity: 2, amount: 63_000 }]);
  });

  it('retient les déclinaisons les moins chères de l’appareil', () => {
    const [discount] = priceBundles(
      [phonePack],
      [
        { productId: 'phone', unitPriceAmount: 400_000, quantity: 1 },
        { productId: 'phone', unitPriceAmount: 300_000, quantity: 1 },
        { productId: 'charger', unitPriceAmount: 15_000, quantity: 1 },
      ],
    );
    expect(discount?.amount).toBe(31_500);
  });

  it('ne compte chaque unité que dans un pack, le plus avantageux d’abord', () => {
    const earphonesPack: PricingBundle = {
      id: 'b2',
      title: 'Pack iPhone 12 + écouteurs',
      anchorProductId: 'phone',
      itemProductIds: ['earphones'],
      discountType: 'AMOUNT',
      discountValue: 40_000,
    };
    const discounts = priceBundles(
      [phonePack, earphonesPack],
      [
        { productId: 'phone', unitPriceAmount: 300_000, quantity: 1 },
        { productId: 'charger', unitPriceAmount: 15_000, quantity: 1 },
        { productId: 'earphones', unitPriceAmount: 50_000, quantity: 1 },
      ],
    );
    expect(discounts).toEqual([{ bundleId: 'b2', title: earphonesPack.title, quantity: 1, amount: 40_000 }]);
  });
});
