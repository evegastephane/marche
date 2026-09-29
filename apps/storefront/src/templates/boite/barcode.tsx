'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/format';

/**
 * Motifs Code 128 (barre, espace, barre… en modules), valeurs 0 à 106. Chaque motif fait 11 modules,
 * le motif d'arrêt 13.
 */
export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

const START_B = 104;
const STOP = 106;

/**
 * Encode un texte en Code 128 (jeu B : ASCII imprimable) et renvoie la suite des largeurs, barres et
 * espaces alternés, en commençant par une barre. `null` si un caractère sort du jeu B.
 */
export function code128(text: string): number[] | null {
  const values: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) return null;
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, value, i) => sum + value * (i + 1), START_B) % 103;
  return [START_B, ...values, checksum, STOP].flatMap((value) => [...CODE128_PATTERNS[value]!].map(Number));
}

/**
 * Code-barres de la référence (SKU) de la déclinaison choisie, lisible par un lecteur. Quand la référence
 * change, les barres se redessinent et la ligne du lecteur balaie l'étiquette.
 */
export function Barcode({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  const widths = code128(value);
  if (!widths) return null;
  const quiet = 10;
  const total = widths.reduce((a, b) => a + b, 0) + quiet * 2;
  let x = quiet;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return (
    <figure className={cn('relative flex flex-col items-start gap-1 overflow-hidden', className)}>
      <svg
        key={value}
        viewBox={`0 0 ${total} 40`}
        preserveAspectRatio="none"
        className="h-14 w-full max-w-[18rem] text-fg"
        role="img"
        aria-label={`Code-barres de la référence ${value}`}
        shapeRendering="crispEdges"
      >
        {bars.map((bar, i) => (
          <motion.rect
            key={i}
            x={bar.x}
            y={0}
            width={bar.w}
            height={40}
            fill="currentColor"
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            style={{ originY: 1 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : (bar.x / total) * 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </svg>
      {!reduce && (
        <motion.span
          key={`scan-${value}`}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary shadow-[0_0_10px_2px_var(--color-primary)]"
          initial={{ left: '0%', opacity: 1 }}
          animate={{ left: '100%', opacity: [1, 1, 0] }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      )}
      <figcaption className="tabular font-hand text-xs tracking-[0.2em]">{value}</figcaption>
    </figure>
  );
}
