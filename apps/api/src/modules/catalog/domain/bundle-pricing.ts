import type { BundleDiscountType } from '@marche/contracts';

/** Pack actif, tel que le calcul des remises en a besoin. */
export interface PricingBundle {
  id: string;
  title: string;
  anchorProductId: string;
  itemProductIds: readonly string[];
  discountType: BundleDiscountType;
  discountValue: number;
}

/** Ligne de panier (ou de commande) : une déclinaison d'un produit, à un prix unitaire. */
export interface PricingLine {
  productId: string;
  unitPriceAmount: number;
  quantity: number;
}

/** Remise d'un pack, appliquée `quantity` fois. */
export interface BundleDiscount {
  bundleId: string;
  title: string;
  quantity: number;
  amount: number;
}

/** Remise d'un exemplaire de pack, pour les prix unitaires retenus. */
export function packDiscount(bundle: Pick<PricingBundle, 'discountType' | 'discountValue'>, unitPrices: readonly number[]): number {
  const total = unitPrices.reduce((sum, price) => sum + price, 0);
  const raw =
    bundle.discountType === 'PERCENT' ? Math.round((total * bundle.discountValue) / 100) : bundle.discountValue;
  return Math.max(0, Math.min(raw, total));
}

/**
 * Remises des packs d'un panier : un pack s'applique dès que l'appareil et tous ses accessoires
 * y sont, autant de fois que les quantités le permettent. Chaque unité ne sert qu'à un pack ;
 * le pack le plus avantageux est retenu en premier, sur les unités les moins chères (jamais
 * plus que le total des articles concernés). Le calcul est refait par le serveur à chaque
 * lecture du panier et au passage de la commande : le client ne l'impose jamais.
 */
export function priceBundles(bundles: readonly PricingBundle[], lines: readonly PricingLine[]): BundleDiscount[] {
  // Unités disponibles par produit, de la moins chère à la plus chère.
  const pool = new Map<string, number[]>();
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const units = pool.get(line.productId) ?? [];
    for (let i = 0; i < line.quantity; i += 1) units.push(line.unitPriceAmount);
    pool.set(line.productId, units);
  }
  for (const units of pool.values()) units.sort((a, b) => a - b);

  const candidates = bundles.map((bundle) => ({
    bundle,
    products: [...new Set([bundle.anchorProductId, ...bundle.itemProductIds])],
  }));
  const applied = new Map<string, BundleDiscount>();

  for (;;) {
    let best: { bundle: PricingBundle; products: string[]; amount: number } | null = null;
    for (const { bundle, products } of candidates) {
      if (!products.every((productId) => (pool.get(productId)?.length ?? 0) > 0)) continue;
      const amount = packDiscount(
        bundle,
        products.map((productId) => pool.get(productId)![0]!),
      );
      if (amount > 0 && (!best || amount > best.amount)) best = { bundle, products, amount };
    }
    if (!best) break;
    for (const productId of best.products) pool.get(productId)!.shift();
    const entry = applied.get(best.bundle.id) ?? { bundleId: best.bundle.id, title: best.bundle.title, quantity: 0, amount: 0 };
    entry.quantity += 1;
    entry.amount += best.amount;
    applied.set(best.bundle.id, entry);
  }
  return [...applied.values()];
}
