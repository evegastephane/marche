'use client';

import { RotateCcw } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { ROOT_DOMAIN, storeSlug } from '@/lib/platform';
import { Beam, type Lamp } from './beam';
import { useShownName } from './state';

/** Vente au comptoir de la boutique d'exemple (données synthétiques, FCFA). Seules les espèces rendent la monnaie. */
const LINES = [
  { label: 'Robe wax Ndeye · M', amount: '18 000' },
  { label: 'Sac en raphia', amount: '12 500' },
  { label: 'Pagne wax Feuilles', amount: '15 000' },
];
const PAYMENTS = [
  { label: 'Wave', amount: '25 000' },
  { label: 'Espèces', amount: '21 000' },
  { label: 'Rendu', amount: '500' },
];

/**
 * L'imprimante thermique du comptoir : le ticket sort par à-coups, au nom de la boutique écrite sur l'enseigne.
 */
export function Receipt() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { once: true, amount: 0.4 });
  const [run, setRun] = useState(0);
  const { name } = useShownName();
  const printed = inView || reduce;
  const stage = useRef<HTMLDivElement>(null);
  const bulb = useRef<HTMLSpanElement>(null);
  const readLamps = useCallback((): Lamp[] => {
    const frame = stage.current?.getBoundingClientRect();
    const rect = bulb.current?.getBoundingClientRect();
    if (!frame || !rect) return [];
    return [
      {
        x: rect.left + rect.width / 2 - frame.left,
        y: rect.top - frame.top,
        power: 0.95,
        spread: 0.5,
        reach: 760,
      },
    ];
  }, []);

  return (
    <figure
      ref={box}
      className="relative mx-auto flex w-full max-w-[24rem] flex-col items-center pt-16"
      aria-label={`Ticket de caisse d’exemple de ${name} : trois articles, 45 500 FCFA, payés en Wave et en espèces, 500 FCFA rendus.`}
    >
      {/* La lampe du comptoir : le ticket sort sous son cône. */}
      <div
        ref={stage}
        aria-hidden
        // Le calque porte le mode « screen » : posé au-dessus de l'imprimante, il ne peut pas l'isoler.
        className="pointer-events-none absolute -inset-x-24 -top-6 -bottom-10 z-20 mix-blend-screen"
      >
        <Beam lamps={readLamps} className="h-full w-full" />
      </div>
      <span
        aria-hidden
        className="absolute top-0 left-1/2 z-10 h-14 w-9 -translate-x-1/2"
      >
        <svg viewBox="0 0 36 56" className="h-full w-full">
          <path d="M18 0V36" stroke="#3a3833" strokeWidth="1.5" />
          <path d="M12 36H24L30 49H6Z" fill="#232227" />
          <ellipse cx="18" cy="49.5" rx="10" ry="2" fill="#ffe4cf" />
        </svg>
        <span
          ref={bulb}
          className="absolute bottom-[5px] left-1/2 size-1 -translate-x-1/2"
        />
      </span>
      <div
        aria-hidden
        className="relative z-10 flex h-16 w-full items-end justify-center rounded-t-[1.25rem] rounded-b-md bg-gradient-to-b from-[#26252b] to-[#151418] px-5 pb-3 shadow-[0_24px_40px_-20px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.08)]"
      >
        <span className="absolute top-3 left-5 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#ff8d4d] shadow-[0_0_8px_rgb(246_107_33/0.9)]" />
          <span className="text-[0.625rem] font-[600] text-[var(--ul-ink-3)]">
            Imprimante
          </span>
        </span>
        <span className="h-1.5 w-[86%] rounded-full bg-[#050506] shadow-[inset_0_1px_2px_rgb(0_0_0/0.9)]" />
      </div>
      <div aria-hidden className="-mt-2 w-[82%] overflow-hidden pt-2">
        <motion.div
          key={run}
          className="ul-ticket ul-mono flex flex-col gap-3 rounded-b-sm px-5 pt-5 pb-7 text-[0.75rem] leading-[1.5] tabular-nums"
          initial={reduce ? false : { y: '-100%' }}
          animate={printed ? { y: '0%' } : { y: '-100%' }}
          transition={{ duration: 2.8, ease: (t) => Math.floor(t * 22) / 22 }}
        >
          <div className="flex flex-col items-center text-center">
            <span className="max-w-full truncate text-[0.875rem] font-[700] uppercase">
              {name}
            </span>
            <span>Boutique d’exemple · Dakar</span>
            <span>Ticket 0087 · 06/10 · 18:42</span>
          </div>
          <Rule />
          <div className="flex flex-col">
            {LINES.map((line) => (
              <Row key={line.label} label={line.label} amount={line.amount} />
            ))}
          </div>
          <Rule />
          <div className="flex flex-col">
            <Row label="Total FCFA" amount="45 500" strong />
            {PAYMENTS.map((line) => (
              <Row key={line.label} label={line.label} amount={line.amount} />
            ))}
          </div>
          <Rule />
          <div className="flex flex-col items-center text-center">
            <span>Merci, à bientôt !</span>
            <span className="max-w-full truncate">
              {storeSlug(name) || 'votre-boutique'}.{ROOT_DOMAIN}
            </span>
          </div>
        </motion.div>
      </div>
      <figcaption className="mt-4 flex w-full items-center justify-between gap-3">
        <span className="ul-small">Ticket d’exemple</span>
        <button
          type="button"
          className="ul-ghost -mr-2"
          onClick={() => setRun((count) => count + 1)}
        >
          <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
          Réimprimer
        </button>
      </figcaption>
    </figure>
  );
}

function Rule() {
  return <span className="block border-t border-dashed border-[#1d1c1a]/40" />;
}

function Row({
  label,
  amount,
  strong = false,
}: {
  label: string;
  amount: string;
  strong?: boolean;
}) {
  return (
    <span
      className={`flex items-baseline justify-between gap-4 ${strong ? 'text-[0.875rem] font-[700]' : ''}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0">{amount}</span>
    </span>
  );
}
