import type { ShippingSettings } from '@marche/contracts';

/** Calcul des frais de livraison (pattern Strategy), choisi par la configuration de la boutique. */
export interface ShippingStrategy {
  readonly code: ShippingSettings['strategy'];
  compute(subtotalAmount: number): number;
}

export class FlatRateShipping implements ShippingStrategy {
  readonly code = 'FLAT_RATE' as const;

  constructor(private readonly amount: number) {}

  compute(subtotalAmount: number): number {
    return subtotalAmount === 0 ? 0 : this.amount;
  }
}

export class FreeOverThresholdShipping implements ShippingStrategy {
  readonly code = 'FREE_OVER_THRESHOLD' as const;

  constructor(
    private readonly amount: number,
    private readonly threshold: number,
  ) {}

  compute(subtotalAmount: number): number {
    if (subtotalAmount === 0) return 0;
    return subtotalAmount >= this.threshold ? 0 : this.amount;
  }
}

export function shippingStrategyFor(settings: ShippingSettings): ShippingStrategy {
  switch (settings.strategy) {
    case 'FLAT_RATE':
      return new FlatRateShipping(settings.flatRateAmount);
    case 'FREE_OVER_THRESHOLD':
      return new FreeOverThresholdShipping(settings.flatRateAmount, settings.thresholdAmount);
  }
}
