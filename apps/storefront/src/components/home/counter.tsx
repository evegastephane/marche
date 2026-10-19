'use client';

import { Download, Minus, Plus, ScanBarcode, X } from 'lucide-react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Badge, GLIDE, Led, Segmented } from './dashboard/ui';
import { amount, fcfa, PRODUCTS, productById } from './data';
import { gsap } from './gsap';
import { useHome, useShownName } from './state';
import { downloadTicket } from './ticket-image';
import { Swatch } from './wax';

type Method = 'cash' | 'momo' | 'card';
const METHODS: { value: Method; label: string }[] = [
  { value: 'cash', label: 'Espèces' },
  { value: 'momo', label: 'Mobile Money' },
  { value: 'card', label: 'Carte' },
];
const METHOD_LABEL: Record<Method, string> = {
  cash: 'Espèces',
  momo: 'Mobile Money',
  card: 'Carte',
};

interface Line {
  productId: string;
  quantity: number;
}

interface Printed {
  number: number;
  lines: Line[];
  total: number;
  method: Method;
  received: number;
  at: string;
}

/**
 * « Encaissez » : la caisse du dashboard. On touche les articles, on choisit le paiement, on encaisse : la vente sort
 * du même stock que le site et le ticket sort de l'imprimante. La facture A4 est annoncée, pas encore livrée.
 */
export function CounterDemo() {
  const { stock, sellAtCounter } = useHome();
  const [lines, setLines] = useState<Line[]>([
    { productId: 'robe', quantity: 1 },
    { productId: 'sac', quantity: 1 },
  ]);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState<Method>('cash');
  const [tendered, setTendered] = useState<'exact' | '20000' | '50000'>(
    '50000',
  );
  const [printed, setPrinted] = useState<Printed | null>(null);
  const touched = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.25 });

  const total = lines.reduce(
    (sum, line) => sum + productById(line.productId).price * line.quantity,
    0,
  );
  const received =
    tendered === 'exact' ? total : Math.max(Number(tendered), total);
  const change = method === 'cash' ? received - total : 0;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? PRODUCTS.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q))
      : PRODUCTS;
  }, [query]);

  const touch = () => {
    touched.current = true;
  };

  const add = (productId: string) => {
    touch();
    setPrinted(null);
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      const max = stock[productId] ?? 0;
      if (existing) {
        return current.map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.min(max, line.quantity + 1) }
            : line,
        );
      }
      return max > 0 ? [...current, { productId, quantity: 1 }] : current;
    });
  };

  const step = (productId: string, delta: number) => {
    touch();
    setLines((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? {
                ...line,
                quantity: Math.min(
                  stock[productId] ?? 0,
                  line.quantity + delta,
                ),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const checkout = () => {
    if (lines.length === 0) return;
    const number = sellAtCounter(lines);
    setPrinted({
      number,
      lines,
      total,
      method,
      received: method === 'cash' ? received : total,
      at: new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date()),
    });
    setLines([]);
  };

  // Sans geste du visiteur, la vente d'exemple s'encaisse seule après un moment.
  useEffect(() => {
    if (!inView || touched.current || printed) return;
    const timer = window.setTimeout(() => {
      if (!touched.current) checkout();
    }, 4200);
    return () => window.clearTimeout(timer);
    // checkout lit l'état courant au moment où le minuteur part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, printed]);

  return (
    <div
      ref={root}
      className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14"
    >
      <div data-thread="link" className="uh-dash overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--d-line)] px-5 py-4">
          <div className="flex items-center gap-3">
            <h3 className="d-display text-[1.5rem]">Caisse</h3>
            <Badge tone="on">Caisse ouverte</Badge>
          </div>
          <label className="d-well flex h-10 min-w-0 flex-1 basis-full items-center gap-2 rounded-[0.7rem] px-3 sm:max-w-[19rem] sm:basis-auto">
            <ScanBarcode
              className="size-4 shrink-0 text-[var(--d-ink-3)]"
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="sr-only">Scanner ou chercher un article</span>
            <input
              value={query}
              onChange={(event) => {
                touch();
                setQuery(event.target.value);
              }}
              placeholder="Code-barres, SKU ou IMEI"
              className="min-w-0 flex-1 bg-transparent text-[0.875rem] outline-none placeholder:text-[var(--d-ink-3)]"
            />
          </label>
        </div>
        <div className="grid md:grid-cols-[minmax(0,1fr)_17.5rem]">
          <ul className="grid grid-cols-3 gap-2 p-3 sm:gap-2.5 sm:p-4">
            {shown.map((product, index) => {
              const left = stock[product.id] ?? 0;
              return (
                // Au téléphone, trois articles suffisent à montrer la caisse.
                <li
                  key={product.id}
                  className={index >= 3 ? 'max-sm:hidden' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => add(product.id)}
                    disabled={left === 0}
                    className="d-tile group flex w-full flex-col gap-1.5 p-1.5 text-left disabled:opacity-45 sm:gap-2 sm:p-2"
                  >
                    <Swatch
                      wax={product.wax}
                      radius={12}
                      className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.98] sm:aspect-[4/3]"
                    />
                    <span className="flex min-w-0 flex-col px-0.5">
                      <span className="truncate text-[0.8125rem] font-[600]">
                        {product.name}
                      </span>
                      <span className="text-[0.75rem] font-[600] tabular-nums">
                        {fcfa(product.price)}
                      </span>
                      <span className="text-[0.6875rem] text-[var(--d-ink-3)] tabular-nums">
                        {left === 0 ? 'Épuisé' : `${left} en stock`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="col-span-full py-8 text-center text-[0.875rem] text-[var(--d-ink-2)]">
                Aucun article ne correspond.
              </li>
            )}
          </ul>
          <div className="flex flex-col gap-4 border-t border-[var(--d-line)] bg-[var(--d-surface)] p-4 md:border-t-0 md:border-l">
            <div className="flex items-center justify-between">
              <span className="text-[0.9375rem] font-[650]">Ticket</span>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    touch();
                    setLines([]);
                  }}
                  className="inline-flex items-center gap-1 text-[0.75rem] font-[560] text-[var(--d-ink-2)] hover:text-[var(--d-ink)]"
                >
                  <X className="size-3.5" strokeWidth={2} aria-hidden /> Vider
                </button>
              )}
            </div>
            <ul className="flex flex-col sm:min-h-[7.5rem]">
              <AnimatePresence initial={false}>
                {lines.map((line) => {
                  const product = productById(line.productId);
                  return (
                    <motion.li
                      key={line.productId}
                      layout="position"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0, transition: GLIDE }}
                      exit={{
                        opacity: 0,
                        x: 12,
                        transition: { duration: 0.15 },
                      }}
                      className="flex items-center gap-2 border-b border-[var(--d-line)] py-2 last:border-b-0"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[0.8125rem] font-[600]">
                          {product.name}
                        </span>
                        <span className="text-[0.75rem] text-[var(--d-ink-2)] tabular-nums">
                          {fcfa(product.price * line.quantity)}
                        </span>
                      </span>
                      <span className="d-well flex items-center gap-0.5 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => step(line.productId, -1)}
                          aria-label={`Retirer un ${product.name}`}
                          className="d-key grid size-7 place-items-center rounded-md"
                        >
                          <Minus
                            className="size-3"
                            strokeWidth={2.2}
                            aria-hidden
                          />
                        </button>
                        <span className="min-w-6 text-center text-[0.8125rem] font-[600] tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => step(line.productId, 1)}
                          aria-label={`Ajouter un ${product.name}`}
                          className="d-key grid size-7 place-items-center rounded-md"
                        >
                          <Plus
                            className="size-3"
                            strokeWidth={2.2}
                            aria-hidden
                          />
                        </button>
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
              {lines.length === 0 && (
                <li className="py-6 text-center text-[0.8125rem] text-[var(--d-ink-2)]">
                  Touchez un article pour l’ajouter.
                </li>
              )}
            </ul>
            <div className="flex flex-col gap-3 border-t border-[var(--d-line)] pt-3">
              {lines.length > 0 && (
                <>
                  <Segmented
                    options={METHODS}
                    value={method}
                    onChange={(value) => {
                      touch();
                      setMethod(value);
                    }}
                    name="method"
                    label="Moyen de paiement"
                  />
                  {method === 'cash' && (
                    <div className="flex items-center justify-between gap-2 text-[0.75rem]">
                      <span className="text-[var(--d-ink-2)]">Reçu</span>
                      <Segmented
                        options={[
                          { value: 'exact', label: 'Exact' },
                          { value: '20000', label: '20 000' },
                          { value: '50000', label: '50 000' },
                        ]}
                        value={tendered}
                        onChange={(value) => {
                          touch();
                          setTendered(value);
                        }}
                        name="tendered"
                        label="Montant reçu"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-[0.8125rem] text-[var(--d-ink-2)]">
                  {method === 'cash' && change > 0 && lines.length > 0
                    ? `À rendre ${fcfa(change)}`
                    : 'Total'}
                </span>
                <span className="text-[1.25rem] font-[650] tracking-[-0.02em] tabular-nums">
                  {fcfa(total)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  touch();
                  checkout();
                }}
                disabled={lines.length === 0}
                className="d-key-primary d-key-lg w-full"
              >
                Encaisser
              </button>
            </div>
          </div>
        </div>
      </div>

      <Printer printed={printed} onNext={() => setPrinted(null)} />
    </div>
  );
}

/** L'imprimante thermique du comptoir, le ticket qui en sort, et la facture A4 à venir posée derrière. */
function Printer({
  printed,
  onNext,
}: {
  printed: Printed | null;
  onNext: () => void;
}) {
  const name = useShownName();
  const paper = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Le ticket affiché, en image PNG : mêmes lignes, même police.
  const download = async () => {
    if (!printed) return;
    setSaving(true);
    const font = paper.current
      ? getComputedStyle(paper.current).fontFamily
      : 'ui-monospace, monospace';
    try {
      await downloadTicket(
        {
          store: name,
          city: 'Dakar',
          number: printed.number,
          at: printed.at,
          lines: printed.lines.map((line) => {
            const product = productById(line.productId);
            return {
              label: `${line.quantity} × ${product.name}`,
              amount: amount(product.price * line.quantity),
            };
          }),
          total: fcfa(printed.total),
          method: METHOD_LABEL[printed.method],
          received: amount(printed.received),
          change:
            printed.method === 'cash' && printed.received > printed.total
              ? amount(printed.received - printed.total)
              : null,
        },
        font,
      );
    } finally {
      setSaving(false);
    }
  };

  useLayoutEffect(() => {
    if (!printed || !paper.current) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce) return;
    // Le papier avance par à-coups, comme une tête thermique.
    const tween = gsap.fromTo(
      paper.current,
      { yPercent: -100 },
      { yPercent: 0, duration: 2.1, ease: 'steps(14)' },
    );
    return () => {
      tween.kill();
    };
  }, [printed]);

  return (
    <div className="relative mx-auto flex w-full max-w-[22rem] flex-col items-center pt-2 sm:pt-44">
      <Invoice />
      <div className="uh-printer relative z-10 w-full">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <span className="text-[0.75rem] font-[600] text-[#8e9097]">
            Imprimante · 80 mm
          </span>
          <Led tone={printed ? 'attention' : 'on'} pulse={Boolean(printed)} />
        </div>
        <div className="uh-printer-slot" />
      </div>
      <div
        className="relative z-0 -mt-1 w-[86%] overflow-hidden"
        aria-live="polite"
      >
        <AnimatePresence>
          {printed && (
            <motion.div
              key={printed.number}
              exit={{
                y: 80,
                opacity: 0,
                rotate: 4,
                transition: { duration: 0.45, ease: [0.4, 0, 1, 1] },
              }}
            >
              <div ref={paper} className="uh-ticket">
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-[1rem] font-[800] tracking-[-0.01em]">
                    {name}
                  </span>
                  <span>Dakar</span>
                  <span className="tabular-nums">
                    Ticket n° {printed.number}
                  </span>
                  <span className="tabular-nums">{printed.at}</span>
                </div>
                <hr />
                <ul className="flex flex-col gap-1">
                  {printed.lines.map((line) => {
                    const product = productById(line.productId);
                    return (
                      <li
                        key={line.productId}
                        className="flex justify-between gap-3"
                      >
                        <span className="min-w-0 truncate">
                          {line.quantity} × {product.name}
                        </span>
                        <span className="tabular-nums">
                          {amount(product.price * line.quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <hr />
                <div className="flex justify-between text-[0.9375rem] font-[800]">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{fcfa(printed.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{METHOD_LABEL[printed.method]}</span>
                  <span className="tabular-nums">
                    {amount(printed.received)}
                  </span>
                </div>
                {printed.method === 'cash' &&
                  printed.received > printed.total && (
                    <div className="flex justify-between">
                      <span>Monnaie rendue</span>
                      <span className="tabular-nums">
                        {amount(printed.received - printed.total)}
                      </span>
                    </div>
                  )}
                <hr />
                <span className="block text-center">Merci de votre visite</span>
                <span aria-hidden className="uh-ticket-code" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {printed && (
        <motion.div
          key={`actions-${printed.number}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 1.9 },
          }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <button
            type="button"
            onClick={download}
            disabled={saving}
            className="uh-chip gap-2"
          >
            <Download className="size-4" strokeWidth={2} aria-hidden />
            {saving ? 'Préparation…' : 'Télécharger le ticket'}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="uh-link text-[0.9375rem]"
          >
            Nouvelle vente
          </button>
        </motion.div>
      )}
    </div>
  );
}

/** La facture A4, annoncée : posée derrière l'imprimante, marquée « Bientôt ». */
function Invoice() {
  const name = useShownName();
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(
        new Date(),
      ),
    );
  }, []);
  return (
    <div
      aria-label="Facture A4 : bientôt disponible"
      role="img"
      className="uh-invoice absolute -top-2 -right-2 z-0 hidden w-[15.5rem] sm:block lg:-right-12"
    >
      <span className="uh-soon">Bientôt</span>
      <div
        aria-hidden
        className="flex flex-col gap-2.5 p-4 text-[0.625rem] leading-snug text-[#101115]/70"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-[0.875rem] font-[800] tracking-[0.04em] text-[#101115]">
            FACTURE
          </span>
          <span className="text-right tabular-nums">
            N° F-0042
            <br />
            {today}
          </span>
        </div>
        <span>
          <span className="font-[700] text-[#101115]">{name}</span>
          <br />
          Dakar, Sénégal
        </span>
        <span className="flex flex-col gap-1 border-t border-[#101115]/12 pt-2">
          <span className="flex justify-between">
            <span>Robe wax Ndeye × 1</span>
            <span className="tabular-nums">18 000</span>
          </span>
          <span className="flex justify-between">
            <span>Sac en raphia × 1</span>
            <span className="tabular-nums">12 500</span>
          </span>
        </span>
        <span className="flex justify-between border-t border-[#101115]/12 pt-2 text-[0.75rem] font-[700] text-[#101115]">
          <span>Total</span>
          <span className="tabular-nums">30 500 FCFA</span>
        </span>
      </div>
    </div>
  );
}
