import { CURRENCY_EXPONENT, type Currency } from '@marche/contracts';
import { cn, formatMoney } from '@/lib/format';

/*
 * Afficheur à sept segments, dessiné en SVG : un masque de sept cases par chiffre,
 * les cases allumées dans la couleur des LED, les cases éteintes gardées en fantôme.
 */

type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const H = 4.6; // demi-épaisseur d'un segment
const horizontal = (y: number, x1: number, x2: number) =>
  `${x1},${y} ${x1 + H},${y - H} ${x2 - H},${y - H} ${x2},${y} ${x2 - H},${y + H} ${x1 + H},${y + H}`;
const vertical = (x: number, y1: number, y2: number) =>
  `${x},${y1} ${x + H},${y1 + H} ${x + H},${y2 - H} ${x},${y2} ${x - H},${y2 - H} ${x - H},${y1 + H}`;

const SEGMENTS: Record<Segment, string> = {
  a: horizontal(6, 8.5, 47.5),
  b: vertical(50, 8.5, 47.5),
  c: vertical(50, 52.5, 91.5),
  d: horizontal(94, 8.5, 47.5),
  e: vertical(6, 52.5, 91.5),
  f: vertical(6, 8.5, 47.5),
  g: horizontal(50, 8.5, 47.5),
};
const ORDER: Segment[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

const GLYPHS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  // Case éteinte : le chiffre entier reste en fantôme (zéros de tête d'un compteur).
  _: '',
  ' ': '',
};

/** Un chiffre : sept cases, penchées comme sur un afficheur de prix. */
export function Digit({ char, className }: { char: string; className?: string }) {
  const lit = GLYPHS[char] ?? '';
  return (
    <svg viewBox="-6 0 64 100" className={cn('h-[1em] w-[0.64em] shrink-0 overflow-visible', className)} aria-hidden>
      <g transform="skewX(-6) translate(6 0)">
        {ORDER.map((s) => (
          <polygon key={s} points={SEGMENTS[s]} fill="currentColor" opacity={lit.includes(s) ? 1 : 0.1} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Suite de chiffres : les espaces de groupement deviennent un intervalle, la virgule une case point.
 * `changed` : positions qui viennent de changer (elles clignotent), `pulse` relance le clignotement.
 */
export function Segments({ text, className, changed, pulse = 0 }: { text: string; className?: string; changed?: ReadonlySet<number>; pulse?: number }) {
  return (
    <span aria-hidden className={cn('inline-flex items-end gap-[0.06em]', className)}>
      {[...text].map((char, i) => {
        if (char === ',' || char === '.') {
          return <span key={i} className="mb-[0.02em] size-[0.13em] shrink-0 rounded-full bg-current" />;
        }
        if (!(char in GLYPHS) || char === ' ') {
          return <span key={i} className="w-[0.16em] shrink-0" />;
        }
        const blink = changed?.has(i);
        return <Digit key={blink ? `${i}-${pulse}` : i} char={char} className={blink ? 'seg-blink' : undefined} />;
      })}
    </span>
  );
}

/** Chiffres et unité d'un prix (« 285 000 » et « F CFA »), dans le format de la boutique. */
export function priceDigits(amount: number, currency: Currency): { digits: string; unit: string } {
  const exponent = CURRENCY_EXPONENT[currency];
  const parts = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).formatToParts(amount / 10 ** exponent);
  const digits = parts
    .filter((p) => p.type === 'integer' || p.type === 'group' || p.type === 'decimal' || p.type === 'fraction')
    .map((p) => (p.type === 'group' ? ' ' : p.value))
    .join('');
  return { digits, unit: parts.find((p) => p.type === 'currency')?.value ?? currency };
}

/**
 * Un prix allumé : les chiffres en segments, l'unité en petit à côté. Les lecteurs d'écran
 * entendent le prix écrit en toutes lettres.
 */
export function SegmentPrice({
  amount,
  currency,
  from = false,
  className,
  changed,
  pulse,
}: {
  amount: number;
  currency: Currency;
  /** « dès » devant le prix d'un article à plusieurs prix. */
  from?: boolean;
  className?: string;
  changed?: ReadonlySet<number>;
  pulse?: number;
}) {
  const { digits, unit } = priceDigits(amount, currency);
  return (
    <span className={cn('inline-flex items-end gap-[0.16em] leading-none whitespace-nowrap', className)}>
      <span className="sr-only">
        {from ? 'dès ' : ''}
        {formatMoney(amount, currency)}
      </span>
      {from && (
        <span aria-hidden className="mb-[0.08em] font-body text-[0.3em] font-bold tracking-[0.08em] uppercase">
          dès
        </span>
      )}
      <Segments text={digits} changed={changed} pulse={pulse} />
      <span aria-hidden className="mb-[0.06em] font-body text-[0.3em] font-bold tracking-[0.04em]">
        {unit}
      </span>
    </span>
  );
}
