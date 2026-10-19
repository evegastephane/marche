'use client';

import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChevronsUpDown,
  House,
  Inbox,
  type LucideIcon,
  Megaphone,
  Menu,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Rocket,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useInView } from 'motion/react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';
import { ROOT_DOMAIN, storeSlug } from '@/lib/platform';
import {
  CUSTOMERS,
  type DemoOrder,
  fcfa,
  orderAmount,
  type Period,
  PRODUCTS,
  productById,
  relative,
  REQUESTS,
  REVENUE,
} from '../data';
import { useHome, useShownName } from '../state';
import { Swatch } from '../wax';
import { Badge, cx, EASE_OUT, GLIDE, Led, Rolling, Segmented } from './ui';

/*
 * Réplique interactive du dashboard Upsell (thème clair « L'instrument ») : on y navigue, on expédie, on
 * marque payé, on ajuste le stock, et les commandes de la boutique d'exemple tombent pendant qu'on regarde.
 * Caisse, Campagnes et Site mènent aux chapitres de la page qui les montrent.
 */

type View = 'home' | 'orders' | 'requests' | 'customers' | 'products' | 'stock';
type Jump = 'caisse' | 'campagnes' | 'publiez';

interface NavItem {
  label: string;
  icon: LucideIcon;
  view?: View;
  jump?: Jump;
}

const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ label: 'Accueil', icon: House, view: 'home' }] },
  {
    group: 'Vendre',
    items: [
      { label: 'Caisse', icon: Wallet, jump: 'caisse' },
      { label: 'Commandes', icon: ReceiptText, view: 'orders' },
      { label: 'Demandes', icon: Inbox, view: 'requests' },
      { label: 'Clients', icon: Users, view: 'customers' },
      { label: 'Campagnes', icon: Megaphone, jump: 'campagnes' },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { label: 'Produits', icon: Package, view: 'products' },
      { label: 'Stock', icon: Boxes, view: 'stock' },
    ],
  },
  {
    group: 'Boutique',
    items: [{ label: 'Site', icon: Store, jump: 'publiez' }],
  },
];

const PHONE_KEYS: NavItem[] = [
  { label: 'Accueil', icon: House, view: 'home' },
  { label: 'Commandes', icon: ReceiptText, view: 'orders' },
  { label: 'Stock', icon: Boxes, view: 'stock' },
  { label: 'Site', icon: Store, jump: 'publiez' },
];

export function jumpTo(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** Commandes à expédier, la plus ancienne en tête (comme la file de l'accueil). */
function useToShip(orders: DemoOrder[]) {
  return useMemo(
    () => orders.filter((order) => order.status === 'PLACED'),
    [orders],
  );
}

export function DashboardReplica({ className }: { className?: string }) {
  const { orders, receiveOrder } = useHome();
  const [view, setView] = useState<View>('home');
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.45 });
  const toShip = useToShip(orders);

  // Tant que l'écran est regardé, une commande tombe de temps en temps (quatre au plus).
  useEffect(() => {
    if (!inView || (view !== 'home' && view !== 'orders')) return;
    let stopped = false;
    const timer = window.setInterval(() => {
      if (stopped) return;
      if (!receiveOrder()) {
        stopped = true;
        window.clearInterval(timer);
      }
    }, 6500);
    return () => window.clearInterval(timer);
  }, [inView, view, receiveOrder]);

  const go = (item: NavItem) => {
    if (item.view) setView(item.view);
    else if (item.jump) jumpTo(item.jump);
  };

  return (
    <div ref={root} className={cx('uh-dash @container', className)}>
      <div className="flex h-full min-h-0 @4xl:grid @4xl:grid-cols-[13.5rem_minmax(0,1fr)]">
        <Sidebar view={view} onGo={go} attention={toShip.length} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PhoneHeader />
          <main className="relative min-h-0 flex-1 overflow-hidden px-4 pt-5 @lg:px-6 @4xl:px-8 @4xl:pt-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: EASE_OUT },
                }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
                className="flex flex-col gap-5"
              >
                {view === 'home' && <HomeView onGo={go} />}
                {view === 'orders' && <OrdersView />}
                {view === 'products' && <ProductsView />}
                {view === 'stock' && <StockView />}
                {view === 'customers' && <CustomersView />}
                {view === 'requests' && <RequestsView />}
              </motion.div>
            </AnimatePresence>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[var(--d-canvas)]"
            />
          </main>
          <PhoneNav view={view} onGo={go} attention={toShip.length} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  view,
  onGo,
  attention,
}: {
  view: View;
  onGo: (item: NavItem) => void;
  attention: number;
}) {
  const name = useShownName();
  return (
    <aside className="hidden flex-col border-r border-[var(--d-line)] @4xl:flex">
      <div className="flex items-center gap-[0.3em] px-5 pt-6 pb-4 text-[1.375rem] text-[var(--d-ink)]">
        <UpsellMark className="h-[1.15em] w-auto" />
        <UpsellWordmark className="translate-y-[0.14em]" />
      </div>
      <div className="mx-3">
        <span className="d-key flex h-11 w-full items-center gap-2.5 rounded-[0.7rem] px-2.5 text-left">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--d-ink)] text-[0.75rem] font-[700] text-[var(--d-canvas)]">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[0.875rem] font-[620]">
            {name}
          </span>
          <ChevronsUpDown
            className="size-4 text-[var(--d-ink-3)]"
            strokeWidth={1.8}
            aria-hidden
          />
        </span>
      </div>
      <nav
        aria-label="Navigation du dashboard d'exemple"
        className="flex flex-1 flex-col gap-0.5 px-3 pt-1 pb-4"
      >
        <LayoutGroup id="replica-nav">
          {NAV.map((group) => (
            <div
              key={group.group ?? 'accueil'}
              className="flex flex-col gap-0.5"
            >
              {group.group && (
                <p className="d-legend px-3 pt-3.5 pb-1">{group.group}</p>
              )}
              {group.items.map((item) => {
                const active = item.view === view;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onGo(item)}
                    aria-current={active ? 'page' : undefined}
                    className="d-nav group"
                    data-active={active}
                  >
                    {active && (
                      <motion.span
                        layoutId="replica-knob"
                        className="d-nav-knob"
                        transition={GLIDE}
                      />
                    )}
                    <item.icon
                      className="relative size-[1.0625rem]"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <span className="relative flex-1 text-left">
                      {item.label}
                    </span>
                    {item.view === 'orders' && attention > 0 && (
                      <span className="relative flex items-center gap-2">
                        <span className="tabular-nums text-[0.75rem] font-[500] text-[var(--d-ink-2)]">
                          {attention}
                        </span>
                        <Led tone="attention" />
                        <span className="sr-only">à expédier</span>
                      </span>
                    )}
                    {item.jump && (
                      <ArrowUpRight
                        className="relative size-3.5 text-[var(--d-ink-3)] opacity-0 transition-opacity group-hover:opacity-100"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </LayoutGroup>
      </nav>
    </aside>
  );
}

function PhoneHeader() {
  const name = useShownName();
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--d-line)] px-4 @4xl:hidden">
      <span className="flex min-w-0 items-center gap-2.5">
        <UpsellMark className="h-6 w-auto text-[var(--d-ink)]" />
        <span className="truncate text-[0.9375rem] font-[650]">{name}</span>
      </span>
      <Menu
        className="size-5 text-[var(--d-ink-2)]"
        strokeWidth={1.8}
        aria-hidden
      />
    </div>
  );
}

function PhoneNav({
  view,
  onGo,
  attention,
}: {
  view: View;
  onGo: (item: NavItem) => void;
  attention: number;
}) {
  return (
    <nav
      aria-label="Navigation du dashboard d'exemple"
      className="grid shrink-0 grid-cols-4 border-t border-[var(--d-line)] bg-[var(--d-surface)] px-2 py-1.5 @4xl:hidden"
    >
      {PHONE_KEYS.map((item) => {
        const active = item.view === view;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onGo(item)}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.6875rem] font-[600]',
              active ? 'text-[var(--d-ink)]' : 'text-[var(--d-ink-3)]',
            )}
          >
            <span className="relative">
              <item.icon className="size-5" strokeWidth={1.8} aria-hidden />
              {item.view === 'orders' && attention > 0 && (
                <Led
                  tone="attention"
                  className="absolute -top-0.5 -right-1.5"
                />
              )}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ——— Accueil ——— */

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
];

function useToday() {
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    );
  }, []);
  return today;
}

function HomeView({ onGo }: { onGo: (item: NavItem) => void }) {
  const { orders, stock, extraRevenue, siteLive } = useHome();
  const name = useShownName();
  const today = useToday();
  const [period, setPeriod] = useState<Period>('30d');
  const toShip = useToShip(orders);
  const low = PRODUCTS.filter(
    (product) => (stock[product.id] ?? 0) <= product.threshold,
  );
  const out = low.filter((product) => (stock[product.id] ?? 0) === 0).length;
  const fresh = orders.filter((order) => order.minutesAgo === 0).length;
  const revenue = REVENUE[period].amount + extraRevenue;
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { once: true, amount: 0.6 });

  return (
    <>
      <header className="flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="d-display truncate text-[1.75rem] @4xl:text-[2.25rem]">
            {name}
          </h3>
          <p className="min-h-[1.5em] text-[0.875rem] text-[var(--d-ink-2)] first-letter:uppercase">
            {today}
          </p>
        </div>
        {siteLive ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="d-well inline-flex h-9 max-w-full items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-[560]">
              <Led tone="on" />
              <span className="truncate tabular-nums">
                {storeSlug(name) || 'chez-awa'}.{ROOT_DOMAIN}
              </span>
            </span>
            <button
              type="button"
              onClick={() => jumpTo('publiez')}
              className="d-key-ghost d-key-md"
            >
              Personnaliser
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() =>
              onGo({ label: 'Site', icon: Store, jump: 'publiez' })
            }
            className={cx(
              'd-key-md self-start',
              toShip.length === 0 ? 'd-key-primary' : 'd-key',
            )}
          >
            <Rocket className="size-4" strokeWidth={1.8} aria-hidden /> Mettre
            mon site en ligne
          </button>
        )}
      </header>

      <section
        ref={box}
        aria-label="Afficheur"
        className="d-display-window grid grid-cols-2 overflow-hidden rounded-2xl @4xl:grid-cols-[1.7fr_1fr_1fr]"
      >
        <div className="col-span-2 flex min-h-[6.5rem] flex-col justify-between gap-2 border-b border-[var(--d-display-line)] p-3.5 @lg:min-h-[8.5rem] @lg:gap-3 @lg:p-5 @4xl:col-span-1 @4xl:min-h-[9.5rem] @4xl:border-r @4xl:border-b-0">
          <span className="flex min-h-8 items-center justify-between gap-3">
            <span className="d-legend">Ventes</span>
            <Segmented
              options={PERIODS}
              value={period}
              onChange={setPeriod}
              name="period"
              label="Période"
              display
            />
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <Rolling
              value={seen ? revenue : 0}
              className="d-readout text-[1.875rem] @lg:text-[2.25rem] @4xl:text-[3rem]"
            />
            <span className="text-[0.9375rem] font-[500] text-[var(--d-display-dim)]">
              FCFA
            </span>
          </span>
          <span className="text-[0.75rem] text-[var(--d-display-dim)]">
            {REVENUE[period].orders + fresh} commandes hors annulées
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            onGo({ label: 'Commandes', icon: ReceiptText, view: 'orders' })
          }
          className="group flex min-h-[6.5rem] flex-col justify-between gap-2 border-r border-[var(--d-display-line)] p-3.5 text-left transition-colors hover:bg-black/[0.03] @lg:min-h-[8.5rem] @lg:gap-3 @lg:p-5 @4xl:min-h-[9.5rem]"
        >
          <span className="flex min-h-8 items-center justify-between gap-3">
            <span className="d-legend flex items-center gap-2">
              À expédier {toShip.length > 0 && <Led tone="attention" pulse />}
            </span>
            <ArrowUpRight
              className="size-4 text-[var(--d-display-dim)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={1.8}
              aria-hidden
            />
          </span>
          <Rolling
            value={seen ? toShip.length : 0}
            className="d-readout text-[1.875rem] @lg:text-[2.25rem] @4xl:text-[3rem]"
          />
          <span className="text-[0.75rem] text-[var(--d-display-dim)]">
            {toShip.length > 0 ? 'en attente de départ' : 'rien en attente'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onGo({ label: 'Stock', icon: Boxes, view: 'stock' })}
          className="group flex min-h-[6.5rem] flex-col justify-between gap-2 p-3.5 text-left transition-colors hover:bg-black/[0.03] @lg:min-h-[8.5rem] @lg:gap-3 @lg:p-5 @4xl:min-h-[9.5rem]"
        >
          <span className="flex min-h-8 items-center justify-between gap-3">
            <span className="d-legend">Stock bas</span>
            <ArrowUpRight
              className="size-4 text-[var(--d-display-dim)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={1.8}
              aria-hidden
            />
          </span>
          <Rolling
            value={seen ? low.length : 0}
            className="d-readout text-[1.875rem] @lg:text-[2.25rem] @4xl:text-[3rem]"
          />
          <span className="text-[0.75rem] text-[var(--d-display-dim)]">
            {out > 0 ? `dont ${out} en rupture` : 'articles sous le seuil'}
          </span>
        </button>
      </section>

      <div className="grid items-start gap-5 @4xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="d-panel overflow-hidden">
          <CardHeader
            title="À expédier"
            count={toShip.length}
            action={
              <button
                type="button"
                onClick={() =>
                  onGo({
                    label: 'Commandes',
                    icon: ReceiptText,
                    view: 'orders',
                  })
                }
                className="group inline-flex items-center gap-1 text-[0.8125rem] font-[560] text-[var(--d-ink-2)] hover:text-[var(--d-ink)]"
              >
                Toutes les commandes
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </button>
            }
          />
          <ShipQueue orders={toShip.slice(0, 4)} />
        </section>
        <div className="hidden flex-col gap-5 @2xl:flex">
          <Startup siteLive={siteLive} />
          <section className="d-panel overflow-hidden">
            <CardHeader title="Stock bas" count={low.length} />
            <ul className="border-t border-[var(--d-line)]">
              {low.length === 0 && (
                <li className="px-5 py-6 text-[0.8125rem] text-[var(--d-ink-2)]">
                  Stock au-dessus des seuils.
                </li>
              )}
              {low.map((product) => {
                const left = stock[product.id] ?? 0;
                return (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--d-line)] px-5 py-3 last:border-b-0"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[0.875rem] font-[600]">
                        {product.name}
                      </span>
                      <span className="truncate text-[0.75rem] text-[var(--d-ink-2)]">
                        {product.variant} · {product.sku}
                      </span>
                    </span>
                    {left === 0 ? (
                      <Badge tone="danger">Rupture</Badge>
                    ) : (
                      <Badge tone="attention">Plus que {left}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

/** Les trois étapes qui mènent à une boutique qui vend : allumé = fait. « Mettre le site en ligne » mène au chapitre Site. */
function Startup({ siteLive }: { siteLive: boolean }) {
  const steps = [
    { title: 'Ajouter un premier produit', done: true },
    { title: 'Mettre le site en ligne', done: siteLive, jump: true },
    { title: 'Recevoir une première commande', done: true },
  ];
  if (steps.every((step) => step.done)) return null;
  return (
    <section className="d-panel overflow-hidden">
      <CardHeader
        title="Démarrage"
        action={
          <span className="flex items-center gap-1" aria-hidden>
            {steps.map((step) => (
              <span
                key={step.title}
                className="d-well h-2 w-5 overflow-hidden rounded-[3px]"
              >
                {step.done && (
                  <span className="block h-full w-full bg-[var(--d-ink)]" />
                )}
              </span>
            ))}
          </span>
        }
      />
      <ol className="flex flex-col px-2 pb-2">
        {steps.map((step) => (
          <li key={step.title}>
            <button
              type="button"
              onClick={step.jump ? () => jumpTo('publiez') : undefined}
              disabled={!step.jump}
              className={cx(
                'group flex w-full items-center gap-3 rounded-[0.7rem] px-3 py-2 text-left text-[0.875rem] transition-colors enabled:hover:bg-[var(--d-surface-2)]',
                step.done ? 'text-[var(--d-ink-2)]' : 'text-[var(--d-ink)]',
              )}
            >
              <Led tone={step.done ? 'on' : 'off'} />
              <span
                className={cx(
                  'flex-1',
                  step.done
                    ? 'font-[500] line-through decoration-[var(--d-ink-3)]'
                    : 'font-[600]',
                )}
              >
                {step.title}
              </span>
              {!step.done && (
                <ArrowRight
                  className="size-4 text-[var(--d-ink-3)] transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.8}
                  aria-hidden
                />
              )}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CardHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
      <h4 className="flex items-baseline gap-2 text-[0.9375rem] font-[650] tracking-[-0.015em]">
        {title}
        {count !== undefined && (
          <span className="tabular-nums text-[0.8125rem] font-[500] text-[var(--d-ink-3)]">
            {count}
          </span>
        )}
      </h4>
      {action}
    </div>
  );
}

/** La file des commandes à faire partir : la touche de la plus ancienne est allumée. */
function ShipQueue({ orders }: { orders: DemoOrder[] }) {
  const { shipOrder, markPaid } = useHome();
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-[var(--d-line)] px-6 py-8 text-center">
        <span className="text-[0.9375rem] font-[600]">Rien à expédier</span>
        <span className="max-w-[30ch] text-[0.8125rem] text-[var(--d-ink-2)]">
          Les commandes de votre site arrivent ici, jusqu’à leur départ.
        </span>
      </div>
    );
  }
  return (
    <ul className="border-t border-[var(--d-line)]">
      <AnimatePresence initial={false}>
        {orders.map((order, index) => (
          <motion.li
            key={order.number}
            layout="position"
            initial={{
              opacity: 0,
              y: -14,
              backgroundColor: 'rgba(246,107,33,0.10)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              backgroundColor: 'rgba(246,107,33,0)',
              transition: { ...GLIDE, backgroundColor: { duration: 2.4 } },
            }}
            exit={{
              opacity: 0,
              x: 48,
              transition: { duration: 0.26, ease: EASE_OUT },
            }}
            className="border-b border-[var(--d-line)] last:border-b-0"
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 px-5 py-3">
              <span className="d-well inline-flex h-9 min-w-14 items-center justify-center rounded-[0.7rem] px-2 text-[0.875rem] font-[600] tabular-nums">
                #{order.number}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[0.875rem] font-[600]">
                  {order.customer}
                </span>
                <span className="flex flex-wrap items-center gap-x-1.5 text-[0.75rem] text-[var(--d-ink-2)] tabular-nums">
                  <span className="whitespace-nowrap">
                    {order.quantity} article{order.quantity > 1 ? 's' : ''}{' '}
                    <span aria-hidden>·</span>
                  </span>
                  <span className="font-[600] whitespace-nowrap text-[var(--d-ink)]">
                    {fcfa(orderAmount(order))}
                  </span>
                  <span className="whitespace-nowrap @max-lg:hidden">
                    <span aria-hidden>·</span> {relative(order.minutesAgo)}
                  </span>
                  {order.payment === 'UNPAID' && (
                    <Badge tone="off" className="ml-1">
                      Non payée
                    </Badge>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {order.payment === 'UNPAID' && (
                  <button
                    type="button"
                    onClick={() => markPaid(order.number)}
                    className="d-key d-key-sm @max-lg:hidden"
                  >
                    Payée
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => shipOrder(order.number)}
                  className={cx(
                    'd-key-sm',
                    index === 0 ? 'd-key-primary' : 'd-key',
                  )}
                >
                  Expédier
                </button>
              </span>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/* ——— Commandes ——— */

type OrderFilter = 'all' | 'to-ship' | 'unpaid' | 'fulfilled';
const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'to-ship', label: 'À expédier' },
  { value: 'unpaid', label: 'Non payées' },
  { value: 'fulfilled', label: 'Expédiées' },
];

function OrdersView() {
  const { orders, shipOrder } = useHome();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const shown = orders.filter((order) =>
    filter === 'all'
      ? true
      : filter === 'to-ship'
        ? order.status === 'PLACED'
        : filter === 'unpaid'
          ? order.payment === 'UNPAID'
          : order.status === 'FULFILLED',
  );
  return (
    <>
      <ViewTitle title="Commandes" />
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          name="orders"
          label="Filtrer les commandes"
        />
      </div>
      <section className="d-panel overflow-hidden">
        <div className="hidden grid-cols-[4.5rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_6.5rem_7.5rem] gap-3 border-b border-[var(--d-line)] px-5 py-2.5 @3xl:grid">
          {['N°', 'Client', 'Total', 'Origine', 'Paiement', 'Statut'].map(
            (label) => (
              <span key={label} className="d-legend">
                {label}
              </span>
            ),
          )}
        </div>
        <ul>
          <AnimatePresence initial={false}>
            {shown.slice(0, 7).map((order) => (
              <motion.li
                key={order.number}
                layout="position"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0, transition: GLIDE }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--d-line)] px-5 py-3 text-[0.875rem] last:border-b-0 @3xl:grid-cols-[4.5rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_6.5rem_7.5rem]"
              >
                <span className="font-[600] tabular-nums">#{order.number}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-[600]">{order.customer}</span>
                  <span className="truncate text-[0.75rem] text-[var(--d-ink-2)]">
                    {productById(order.productId).name}
                  </span>
                </span>
                <span className="hidden font-[560] tabular-nums @3xl:block">
                  {fcfa(orderAmount(order))}
                </span>
                <span className="hidden text-[var(--d-ink-2)] @3xl:block">
                  {order.source}
                </span>
                <span className="hidden @3xl:block">
                  <Badge tone={order.payment === 'PAID' ? 'on' : 'off'}>
                    {order.payment === 'PAID' ? 'Payée' : 'Non payée'}
                  </Badge>
                </span>
                <span className="justify-self-end @3xl:justify-self-start">
                  {order.status === 'PLACED' ? (
                    <button
                      type="button"
                      onClick={() => shipOrder(order.number)}
                      className="d-key d-key-sm"
                    >
                      Expédier
                    </button>
                  ) : (
                    <Badge tone="on">Expédiée</Badge>
                  )}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </>
  );
}

function ViewTitle({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h3 className="d-display flex items-baseline gap-2.5 text-[1.75rem] @4xl:text-[2rem]">
        {title}
        {count !== undefined && (
          <span className="text-[1rem] font-[500] tracking-normal text-[var(--d-ink-3)] tabular-nums">
            {count}
          </span>
        )}
      </h3>
      {action}
    </div>
  );
}

/* ——— Produits ——— */

function ProductsView() {
  const { stock } = useHome();
  return (
    <>
      <ViewTitle
        title="Produits"
        count={PRODUCTS.length}
        action={
          <span className="d-key d-key-md">
            <Plus className="size-4" strokeWidth={1.8} aria-hidden /> Nouveau
            produit
          </span>
        }
      />
      <section className="d-panel overflow-hidden">
        <ul>
          {PRODUCTS.map((product) => {
            const left = stock[product.id] ?? 0;
            return (
              <li
                key={product.id}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-[var(--d-line)] px-5 py-2.5 last:border-b-0 @3xl:grid-cols-[2.75rem_minmax(0,1fr)_8rem_7rem_7rem]"
              >
                <Swatch wax={product.wax} radius={14} className="size-11" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.875rem] font-[600]">
                    {product.name}
                  </span>
                  <span className="truncate text-[0.75rem] text-[var(--d-ink-2)]">
                    {product.variant}
                  </span>
                </span>
                <span className="hidden text-[0.875rem] font-[560] tabular-nums @3xl:block">
                  {fcfa(product.price)}
                </span>
                <span className="hidden text-[0.8125rem] text-[var(--d-ink-2)] tabular-nums @3xl:block">
                  {left === 0 ? 'Épuisé' : `${left} en stock`}
                </span>
                <Badge tone={left === 0 ? 'danger' : 'on'}>
                  {left === 0 ? 'Épuisé' : 'En vente'}
                </Badge>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/* ——— Stock ——— */

function StockView() {
  const { stock, adjustStock } = useHome();
  return (
    <>
      <ViewTitle title="Stock" />
      <p className="-mt-2 text-[0.8125rem] text-[var(--d-ink-2)]">
        Ajustez une quantité : le site d’exemple plus bas suit à la seconde.
      </p>
      <section className="d-panel overflow-hidden">
        <ul>
          {PRODUCTS.map((product) => {
            const left = stock[product.id] ?? 0;
            const tone =
              left === 0
                ? 'danger'
                : left <= product.threshold
                  ? 'attention'
                  : 'on';
            return (
              <li
                key={product.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--d-line)] px-5 py-2.5 last:border-b-0 @3xl:grid-cols-[minmax(0,1fr)_8rem_auto]"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.875rem] font-[600]">
                    {product.name}
                  </span>
                  <span className="truncate text-[0.75rem] text-[var(--d-ink-2)]">
                    {product.variant} · {product.sku}
                  </span>
                </span>
                <span className="hidden @3xl:block">
                  <Badge tone={tone}>
                    {left === 0
                      ? 'Rupture'
                      : left <= product.threshold
                        ? 'Stock bas'
                        : 'Disponible'}
                  </Badge>
                </span>
                <span className="d-well flex items-center gap-1 rounded-[0.7rem] p-1">
                  <button
                    type="button"
                    onClick={() => adjustStock(product.id, -1)}
                    disabled={left === 0}
                    aria-label={`Retirer un ${product.name}`}
                    className="d-key grid size-8 place-items-center rounded-lg disabled:opacity-40"
                  >
                    <Minus className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                  <span
                    className="min-w-9 text-center text-[1rem] font-[600] tabular-nums"
                    aria-live="polite"
                  >
                    {left}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustStock(product.id, 1)}
                    aria-label={`Ajouter un ${product.name}`}
                    className="d-key grid size-8 place-items-center rounded-lg"
                  >
                    <Plus className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/* ——— Clients ——— */

function CustomersView() {
  return (
    <>
      <ViewTitle title="Clients" count={CUSTOMERS.length} />
      <section className="d-panel overflow-hidden">
        <ul>
          {CUSTOMERS.map((customer) => (
            <li
              key={customer.name}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--d-line)] px-5 py-3 text-[0.875rem] last:border-b-0 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_6rem_8rem]"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-[600]">{customer.name}</span>
                <span className="truncate text-[0.75rem] text-[var(--d-ink-2)] tabular-nums">
                  {customer.phone}
                </span>
              </span>
              <span className="hidden @3xl:block">
                <Badge tone={customer.whatsapp ? 'on' : 'off'}>
                  {customer.whatsapp ? 'Nouveautés WhatsApp' : 'Sans WhatsApp'}
                </Badge>
              </span>
              <span className="hidden text-[var(--d-ink-2)] tabular-nums @3xl:block">
                {customer.orders} commandes
              </span>
              <span className="font-[560] tabular-nums">
                {fcfa(customer.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ——— Demandes ——— */

function RequestsView() {
  return (
    <>
      <ViewTitle title="Demandes" count={REQUESTS.length} />
      <p className="-mt-2 text-[0.8125rem] text-[var(--d-ink-2)]">
        Ce que vos clients cherchent et que vous n’avez pas encore.
      </p>
      <section className="d-panel overflow-hidden">
        <ul>
          {REQUESTS.map((request) => (
            <li
              key={request.what}
              className="flex items-center justify-between gap-3 border-b border-[var(--d-line)] px-5 py-3.5 text-[0.875rem] last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-[600]">{request.what}</span>
                <span className="text-[0.75rem] text-[var(--d-ink-2)]">
                  {request.when}
                </span>
              </span>
              <Badge tone={request.state === 'Nouvelle' ? 'attention' : 'on'}>
                {request.state}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
