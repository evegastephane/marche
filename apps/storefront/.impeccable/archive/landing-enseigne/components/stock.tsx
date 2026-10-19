'use client';

import { Ban, Check, RotateCcw } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { trackSpotlight } from './reactbits/spotlight';
import { Rolling } from './rolling';
import { Swatch, type Wax } from './wax';

const EASE = [0.16, 1, 0.3, 1] as const;

type RacePhase = 'idle' | 'tap' | 'won' | 'lost';
const ORDER: RacePhase[] = ['idle', 'tap', 'won', 'lost'];
const reached = (phase: RacePhase, step: RacePhase) =>
  ORDER.indexOf(phase) >= ORDER.indexOf(step);

/**
 * Deux clientes commandent la dernière robe à la même seconde : la première la réserve, la seconde l'apprend avant
 * de payer. Joué une fois à l'arrivée à l'écran, puis à la demande.
 */
export function Race() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { once: true, amount: 0.55 });
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<RacePhase>('idle');

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setPhase('lost');
      return;
    }
    setPhase('idle');
    const timers = [
      setTimeout(() => setPhase('tap'), 700),
      setTimeout(() => setPhase('won'), 1500),
      setTimeout(() => setPhase('lost'), 2350),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce, run]);

  const stock = reached(phase, 'won') ? 0 : 1;

  return (
    <figure
      ref={box}
      onPointerMove={trackSpotlight}
      className="ul-card ul-spotlight flex flex-col gap-6 p-4 sm:p-8"
      aria-label="Démonstration : deux clientes commandent la dernière robe en taille M ; la première la réserve, la seconde apprend qu’elle n’est plus disponible."
    >
      <div
        aria-hidden
        className="relative grid grid-cols-2 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] sm:gap-0"
      >
        <Wire side="left" lit={reached(phase, 'won')} />
        <Wire
          side="right"
          lit={reached(phase, 'tap')}
          blocked={reached(phase, 'lost')}
        />
        <Shopper
          name="Aïssatou"
          time="18:42:07,31"
          pressed={reached(phase, 'tap')}
          result={reached(phase, 'won') ? 'won' : null}
        />
        <div className="relative z-10 flex items-center justify-center gap-3 rounded-2xl bg-[#1a191d] px-3 py-3 text-center ring-1 ring-white/[0.07] max-sm:order-3 max-sm:col-span-2 sm:mx-auto sm:w-[6.5rem] sm:flex-col sm:gap-1.5 sm:px-2 sm:py-4">
          <span className="text-[0.6875rem] font-[600] text-[var(--ul-ink-3)]">
            Stock · M
          </span>
          <span
            className={`text-[2.75rem] leading-none font-[300] tracking-[-0.03em] transition-colors duration-500 sm:text-[3.5rem] ${
              stock === 0 ? 'text-[var(--ul-ink-3)]' : 'text-[var(--ul-ink)]'
            }`}
          >
            <Rolling value={stock} />
          </span>
          <span className="text-[0.6875rem] leading-tight text-[var(--ul-ink-3)] sm:min-h-[2.4em]">
            {stock === 0 ? 'réservée #1044' : 'dernière pièce'}
          </span>
        </div>
        <Shopper
          name="Fatou"
          time="18:42:07,32"
          pressed={reached(phase, 'tap')}
          result={reached(phase, 'lost') ? 'lost' : null}
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <span className="ul-small">
          Démonstration · boutique d’exemple, à la même seconde
        </span>
        <button
          type="button"
          className="ul-ghost -mr-2"
          onClick={() => setRun((count) => count + 1)}
        >
          <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
          Rejouer
        </button>
      </figcaption>
    </figure>
  );
}

function Shopper({
  name,
  time,
  pressed,
  result,
}: {
  name: string;
  time: string;
  pressed: boolean;
  result: 'won' | 'lost' | null;
}) {
  return (
    <div className="relative z-10 flex min-w-0 flex-col overflow-hidden rounded-[1.4rem] bg-[#fbfaf7] p-2 text-[#1b1a17] shadow-[0_20px_40px_-20px_rgb(0_0_0/0.9)] sm:p-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1 pb-2 text-[0.6875rem]">
        <span className="truncate font-[700]">{name}</span>
        <span className="shrink-0 text-[#6b6962] tabular-nums max-sm:hidden">
          {time}
        </span>
      </div>
      <Swatch wax="cercles" radius={14} className="aspect-[4/3] w-full" />
      <div className="flex flex-col px-1 pt-2">
        <span className="truncate text-[0.75rem] font-[700] sm:text-[0.8125rem]">
          Robe wax Ndeye
        </span>
        <span className="text-[0.6875rem] text-[#6b6962] tabular-nums sm:text-[0.75rem]">
          Taille M · 18 000 FCFA
        </span>
      </div>
      <div className="relative mt-2.5 h-[4.5rem] sm:h-[4.25rem]">
        <motion.span
          className="absolute inset-x-0 top-0 flex h-9 items-center justify-center rounded-full bg-[#1b1a17] text-[0.75rem] font-[700] text-white"
          animate={{
            scale: pressed && !result ? 0.95 : 1,
            opacity: result ? 0 : 1,
          }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {pressed ? 'Envoi…' : 'Commander'}
        </motion.span>
        {result && (
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`absolute inset-0 flex items-start gap-1.5 rounded-xl px-2 py-1.5 text-[0.6875rem] leading-snug sm:text-[0.75rem] ${
              result === 'won'
                ? 'bg-[#1b1a17] text-white'
                : 'bg-[#ecebe6] text-[#3b3a36]'
            }`}
          >
            {result === 'won' ? (
              <Check
                className="mt-px size-3.5 shrink-0 text-[#ff8d4d]"
                strokeWidth={2.6}
              />
            ) : (
              <Ban className="mt-px size-3.5 shrink-0" strokeWidth={2.2} />
            )}
            {result === 'won'
              ? 'Commande #1044 passée : la robe lui est réservée.'
              : 'Plus disponible : elle vient d’être commandée.'}
          </motion.span>
        )}
      </div>
    </div>
  );
}

/** Le fil entre une cliente et le stock : il s'allume quand la commande arrive ; bloqué, il s'arrête à mi-chemin. */
function Wire({
  side,
  lit,
  blocked = false,
}: {
  side: 'left' | 'right';
  lit: boolean;
  blocked?: boolean;
}) {
  const reach = blocked ? 0.55 : 1;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 4"
      preserveAspectRatio="none"
      className={`absolute top-1/2 z-0 h-1 w-1/4 -translate-y-1/2 max-sm:hidden ${
        side === 'left' ? 'left-1/4' : 'right-1/4 -scale-x-100'
      }`}
    >
      <line
        x1="0"
        y1="2"
        x2="100"
        y2="2"
        stroke="rgb(255 255 255 / 0.1)"
        strokeWidth="2"
      />
      <motion.line
        x1="0"
        y1="2"
        x2="100"
        y2="2"
        stroke={side === 'left' ? '#f66b21' : '#8b857d'}
        strokeWidth="2.5"
        initial={false}
        animate={{ pathLength: lit ? reach : 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </svg>
  );
}

/** Journal d'une variante de la boutique d'exemple (données synthétiques). */
const JOURNAL = [
  {
    time: '09:12',
    label: 'Stock initial',
    detail: 'Création de la robe',
    quantity: 3,
  },
  {
    time: '11:40',
    label: 'Réception',
    detail: 'Arrivage du marché',
    quantity: 4,
  },
  { time: '14:05', label: 'Vente', detail: 'Commande #1041', quantity: -1 },
  { time: '16:30', label: 'Perte', detail: 'Tache au repassage', quantity: -1 },
  { time: '17:02', label: 'Retour', detail: 'Commande #1038', quantity: 1 },
];

/** Le journal s'écrit ligne par ligne ; le stock affiché en est la somme. */
export function LedgerCard() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { once: true, amount: 0.45 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setCount(JOURNAL.length);
      return;
    }
    if (count >= JOURNAL.length) return;
    const timer = setTimeout(() => setCount(count + 1), count ? 520 : 300);
    return () => clearTimeout(timer);
  }, [inView, reduce, count]);

  const total = JOURNAL.slice(0, count).reduce(
    (sum, line) => sum + line.quantity,
    0,
  );
  let balance = 0;

  return (
    <article
      ref={box}
      onPointerMove={trackSpotlight}
      className="ul-card ul-spotlight flex flex-col gap-6 p-6 sm:p-8 lg:row-span-2"
    >
      <div className="flex max-w-[34rem] flex-col gap-2">
        <h3 className="ul-title text-[1.5rem] sm:text-[1.75rem]">
          Le journal fait le compte.
        </h3>
        <p className="text-[1rem] leading-[1.55] text-[var(--ul-ink-2)]">
          Chaque entrée et chaque sortie est écrite. Le stock affiché en est la
          somme, et la base de données refuse toute autre façon de le changer.
        </p>
      </div>
      <div className="flex flex-1 flex-col rounded-xl bg-white/[0.025] ring-1 ring-white/[0.07]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 text-[0.75rem] text-[var(--ul-ink-3)]">
          <span>Robe wax Ndeye · taille M</span>
          <span>Exemple</span>
        </div>
        <ol className="flex flex-col">
          {JOURNAL.map((line, index) => {
            balance += line.quantity;
            const shown = index < count;
            return (
              <motion.li
                key={line.time}
                initial={false}
                animate={{ opacity: shown ? 1 : 0.18 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="grid grid-cols-[3rem_minmax(0,1fr)_2.5rem_2rem] items-baseline gap-3 border-b border-white/[0.05] px-4 py-2.5 text-[0.875rem] tabular-nums"
              >
                <span className="text-[var(--ul-ink-3)]">{line.time}</span>
                <span className="min-w-0">
                  <span className="block font-[600]">{line.label}</span>
                  <span className="block truncate text-[0.75rem] text-[var(--ul-ink-3)]">
                    {line.detail}
                  </span>
                </span>
                <span className="text-right font-[600]">
                  {line.quantity > 0
                    ? `+${line.quantity}`
                    : `−${-line.quantity}`}
                </span>
                <span className="text-right text-[var(--ul-ink-3)]">
                  {balance}
                </span>
              </motion.li>
            );
          })}
        </ol>
        <div className="mt-auto flex items-end justify-between px-4 pt-4 pb-4">
          <span className="text-[0.75rem] text-[var(--ul-ink-3)]">
            Stock en main = somme du journal
          </span>
          <span className="text-[3rem] leading-none font-[280] tracking-[-0.03em]">
            <Rolling value={total} />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Une pièce, un numéro : le code est lu à l'arrivée, puis retrouvé à la vente. */
export function SerialCard() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.4 });
  const [sold, setSold] = useState(false);

  useEffect(() => {
    if (!inView || reduce) return;
    const timer = setInterval(() => setSold((value) => !value), 2600);
    return () => clearInterval(timer);
  }, [inView, reduce]);

  return (
    <article
      ref={box}
      onPointerMove={trackSpotlight}
      className="ul-card ul-spotlight flex flex-col gap-5 p-6 sm:p-7"
    >
      <div className="flex flex-col gap-2">
        <h3 className="ul-title text-[1.375rem]">Une pièce, un numéro.</h3>
        <p className="text-[0.9375rem] leading-[1.55] text-[var(--ul-ink-2)]">
          Téléphones et appareils : un IMEI ou un numéro de série par pièce,
          noté à l’arrivée, retrouvé à la vente.
        </p>
      </div>
      <div className="relative mt-auto flex flex-col overflow-hidden rounded-xl bg-[#f4f2ec] text-[#1b1a17]">
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#1b1a17]/25 px-4 py-2.5 text-[0.75rem]">
          <span className="truncate font-[700]">
            Galaxy A16 · 128 Go · Noir
          </span>
          <span className="shrink-0 text-[#6b6962]">3 pièces</span>
        </div>
        {UNITS.map((unit, index) => {
          const active = index === 0;
          const status = active
            ? sold
              ? 'Vendu · #1047'
              : 'En stock'
            : unit.status;
          const fresh = active && !sold;
          return (
            <div
              key={unit.imei}
              className="relative flex items-center gap-3 border-b border-dashed border-[#1b1a17]/15 px-4 py-2.5 last:border-0"
            >
              <Barcode className="h-7 w-14 shrink-0" />
              <span className="ul-mono min-w-0 flex-1 truncate text-[0.75rem] tracking-[0.02em] tabular-nums">
                {unit.imei}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1b1a17] px-2 py-0.5 text-[0.6875rem] font-[600] text-white">
                <span
                  className={`size-1.5 rounded-full ${fresh ? 'bg-[#f66b21]' : 'bg-white'}`}
                />
                {status}
              </span>
              {active && !reduce && (
                <motion.span
                  aria-hidden
                  key={String(sold)}
                  className="absolute top-1.5 bottom-1.5 w-[2px] bg-[#f66b21] shadow-[0_0_12px_2px_rgb(246_107_33/0.7)]"
                  initial={{ left: '1rem', opacity: 0 }}
                  animate={{ left: ['1rem', '4.5rem'], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

/** Pièces d'un même modèle (numéros d'exemple) : la première est lue à l'arrivée, puis retrouvée à la vente. */
const UNITS = [
  { imei: '35 912640 187223 4', status: 'En stock' },
  { imei: '35 912640 187231 7', status: 'En stock' },
  { imei: '35 912640 186904 1', status: 'Vendu · #1039' },
];

/** Barres d'un code-barres d'exemple, dessinées d'une suite fixe. */
function Barcode({ className }: { className?: string }) {
  const widths = [
    2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 2, 3, 1, 2, 1, 1,
    3, 1, 2, 2, 1, 1, 3, 1, 1, 2, 1,
  ];
  let x = 0;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={className}
    >
      {widths.map((width, index) => {
        const bar =
          index % 2 === 0 ? (
            <rect
              key={index}
              x={x}
              y="0"
              width={width * 1.15}
              height="40"
              fill="#1b1a17"
            />
          ) : null;
        x += width * 1.15 + 0.85;
        return bar;
      })}
    </svg>
  );
}

/** Rayon d'exemple : le dernier article baisse, et son alerte s'allume sous le seuil. */
const SHELF: { name: string; wax: Wax; threshold: number; count?: number }[] = [
  { name: 'Pagne wax Feuilles', wax: 'feuilles', threshold: 5, count: 14 },
  { name: 'Robe wax Ndeye · M', wax: 'cercles', threshold: 2, count: 6 },
  { name: 'Sac en raphia', wax: 'raphia', threshold: 3 },
];

/** L'article baisse ; sous le seuil, l'alerte s'allume. */
export function LowStockCard() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.4 });
  const [left, setLeft] = useState(reduce ? 2 : 5);

  useEffect(() => {
    if (!inView || reduce) return;
    const timer = setInterval(
      () => setLeft((value) => (value <= 2 ? 5 : value - 1)),
      1300,
    );
    return () => clearInterval(timer);
  }, [inView, reduce]);

  const low = left <= 3;
  return (
    <article
      ref={box}
      onPointerMove={trackSpotlight}
      className="ul-card ul-spotlight flex flex-col gap-5 p-6 sm:p-7"
    >
      <div className="flex flex-col gap-2">
        <h3 className="ul-title text-[1.375rem]">Prévenu avant la rupture.</h3>
        <p className="text-[0.9375rem] leading-[1.55] text-[var(--ul-ink-2)]">
          Une alerte quand un article descend sous le seuil que vous avez
          choisi.
        </p>
      </div>
      <ul className="flex flex-1 flex-col rounded-xl bg-white/[0.025] ring-1 ring-white/[0.07]">
        {SHELF.map((item) => {
          const count = item.count ?? left;
          const alert = item.count === undefined && low;
          return (
            <li
              key={item.name}
              className="flex items-center gap-3.5 border-b border-white/[0.06] px-4 py-3 last:border-0"
            >
              <Swatch wax={item.wax} radius={10} className="size-10 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[0.875rem] leading-tight font-[650]">
                  {item.name}
                </span>
                <span className="text-[0.75rem] text-[var(--ul-ink-3)]">
                  Seuil d’alerte : {item.threshold}
                </span>
              </span>
              <span className="w-8 text-right text-[1.375rem] leading-none font-[300] tracking-[-0.02em]">
                <Rolling value={count} />
              </span>
              <span
                className={`w-[4.5rem] rounded-full py-0.5 text-center text-[0.6875rem] font-[650] transition-colors duration-300 ${
                  alert
                    ? 'bg-[#f66b21] text-[#101115]'
                    : 'bg-white/[0.06] text-[var(--ul-ink-3)]'
                }`}
              >
                {alert ? 'Stock bas' : 'En stock'}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
