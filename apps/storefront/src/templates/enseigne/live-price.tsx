'use client';

import type { Currency } from '@marche/contracts';
import { useEffect, useRef, useState } from 'react';
import { priceDigits, SegmentPrice } from './segments';

/**
 * Le prix de la fiche : quand la configuration change, les segments s'éteignent et se rallument
 * d'un coup, et seuls les chiffres qui ont changé clignotent deux fois.
 */
export function LivePrice({ amount, currency, className }: { amount: number; currency: Currency; className?: string }) {
  const { digits } = priceDigits(amount, currency);
  const previous = useRef(digits);
  const [blink, setBlink] = useState<{ changed: ReadonlySet<number>; pulse: number }>({ changed: new Set(), pulse: 0 });

  useEffect(() => {
    const before = previous.current;
    if (before === digits) return;
    previous.current = digits;
    // Les chiffres s'alignent à droite, comme sur l'afficheur.
    const changed = new Set<number>();
    for (let i = 0; i < digits.length; i += 1) {
      const j = before.length - (digits.length - i);
      if (j < 0 || before[j] !== digits[i]) changed.add(i);
    }
    setBlink((b) => ({ changed, pulse: b.pulse + 1 }));
  }, [digits]);

  return <SegmentPrice amount={amount} currency={currency} className={className} changed={blink.changed} pulse={blink.pulse} />;
}
