'use client';

import {
  Boxes,
  ChevronsUpDown,
  House,
  Inbox,
  Lock,
  Megaphone,
  Menu,
  Package,
  ReceiptText,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';
import { ROOT_DOMAIN, storeSlug } from '@/lib/platform';
import { Rolling } from './rolling';
import { useShownName } from './state';
import { DEMO_PRODUCTS, Swatch } from './wax';

/** Le site de la boutique tel que le client le voit au téléphone (thème clair du marchand, produits d'exemple). */
export function PhoneSite({ className }: { className?: string }) {
  const { name } = useShownName();
  const slug = storeSlug(name) || 'votre-boutique';
  return (
    <div
      className={`ul-device h-[560px] w-[270px] rounded-[44px] p-[9px] ${className ?? ''}`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[35px] bg-[#fbfaf7] text-[#1b1a17]">
        <span className="absolute top-2 left-1/2 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#0a0a0b]" />
        <div className="flex items-center justify-between px-6 pt-[11px] text-[11px] font-[650] tabular-nums">
          <span>18:42</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[1.5px]">
              {[4, 6, 8, 10].map((h) => (
                <span
                  key={h}
                  className="w-[2.5px] rounded-[1px] bg-[#1b1a17]"
                  style={{ height: h }}
                />
              ))}
            </span>
            <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-[#1b1a17]/60 p-[1.5px]">
              <span className="block h-full w-[70%] rounded-[1.5px] bg-[#1b1a17]" />
            </span>
          </span>
        </div>
        <div className="mx-3 mt-3.5 flex h-7 items-center justify-center gap-1.5 rounded-full bg-[#ecebe6] px-3 text-[10.5px] text-[#55534d]">
          <Lock className="size-3 shrink-0" strokeWidth={2.2} aria-hidden />
          <span className="truncate tabular-nums">
            {slug}.{ROOT_DOMAIN}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
          <span className="truncate text-[19px] leading-tight font-[800] tracking-[-0.03em]">
            {name}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="relative">
              <ShoppingBag className="size-[18px]" strokeWidth={1.8} />
              <span className="absolute -top-1.5 -right-2 grid size-4 place-items-center rounded-full bg-[#1b1a17] text-[9px] font-[700] text-white">
                2
              </span>
            </span>
            <Menu className="size-5" strokeWidth={1.8} />
          </span>
        </div>
        <div className="relative mx-3 overflow-hidden rounded-2xl bg-[#1d3b6f] px-4 py-4 text-[#f6efe2]">
          <Swatch
            wax="cercles"
            radius={0}
            className="absolute top-0 -right-4 h-full w-24 opacity-90"
          />
          <span className="relative block max-w-[11ch] text-[15px] leading-tight font-[700] tracking-[-0.01em]">
            Nouvelle collection wax
          </span>
          <span className="relative mt-3 inline-flex h-7 items-center rounded-full bg-[#f6efe2] px-3.5 text-[11px] font-[700] text-[#1d3b6f]">
            Voir
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 px-3 pt-3.5">
          {DEMO_PRODUCTS.map((product) => (
            <div key={product.name} className="flex min-w-0 flex-col gap-1.5">
              <Swatch
                wax={product.wax}
                radius={12}
                className="aspect-square w-full"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-[650]">
                  {product.name}
                </span>
                <span className="text-[11px] font-[600] tabular-nums">
                  {product.price} FCFA
                </span>
                <span className="text-[10px] text-[#6b6962]">
                  {product.note}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { group: null, items: [{ label: 'Accueil', icon: House, active: true }] },
  {
    group: 'Vendre',
    items: [
      { label: 'Caisse', icon: Wallet },
      { label: 'Commandes', icon: ReceiptText },
      { label: 'Demandes', icon: Inbox },
      { label: 'Clients', icon: Users },
      { label: 'Campagnes', icon: Megaphone },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { label: 'Produits', icon: Package },
      { label: 'Stock', icon: Boxes },
    ],
  },
  { group: 'Boutique', items: [{ label: 'Site', icon: Store }] },
];

interface Order {
  number: number;
  customer: string;
  item: string;
  amount: number;
  status: string;
  todo: boolean;
}

/** Commandes de la boutique d'exemple (données synthétiques). */
const SEED: Order[] = [
  {
    number: 1044,
    customer: 'Aïssatou Diop',
    item: 'Robe wax Ndeye · M',
    amount: 18000,
    status: 'Non payée',
    todo: true,
  },
  {
    number: 1043,
    customer: 'Moussa Ba',
    item: 'Pagne wax Feuilles ×2',
    amount: 30000,
    status: 'Payée',
    todo: false,
  },
  {
    number: 1042,
    customer: 'Comptoir',
    item: 'Boubou brodé',
    amount: 35000,
    status: 'Payée · caisse',
    todo: false,
  },
  {
    number: 1041,
    customer: 'Fatou Sall',
    item: 'Sac en raphia',
    amount: 12500,
    status: 'Expédiée',
    todo: false,
  },
];

/** Commandes qui arrivent pendant qu'on regarde (exemples, dans cet ordre). */
const ARRIVALS: Omit<Order, 'number'>[] = [
  {
    customer: 'Mariama Sow',
    item: 'Pagne wax Feuilles',
    amount: 15000,
    status: 'Non payée',
    todo: true,
  },
  {
    customer: 'Comptoir',
    item: 'Robe wax Ndeye · S',
    amount: 18000,
    status: 'Payée · caisse',
    todo: false,
  },
  {
    customer: 'Ibrahima Fall',
    item: 'Sac en raphia',
    amount: 12500,
    status: 'Non payée',
    todo: true,
  },
  {
    customer: 'Khady Ndiaye',
    item: 'Boubou brodé',
    amount: 35000,
    status: 'Non payée',
    todo: true,
  },
  {
    customer: 'Comptoir',
    item: 'Pagne wax Feuilles ×3',
    amount: 45000,
    status: 'Payée · caisse',
    todo: false,
  },
];

const money = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount);

/**
 * La boutique vit pendant qu'on la regarde : une commande arrive toutes les quelques secondes, les ventes et les
 * colis à expédier montent. Seulement à l'écran ; mouvement réduit : la liste reste celle du départ.
 */
function useLiveOrders(active: boolean) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({
    orders: SEED,
    sales: 84500,
    toShip: 3,
    arrived: 0,
  });
  useEffect(() => {
    if (!active || reduce || state.arrived >= ARRIVALS.length) return;
    const timer = setTimeout(
      () =>
        setState((current) => {
          const arrival = ARRIVALS[current.arrived] as Omit<Order, 'number'>;
          return {
            orders: [
              { ...arrival, number: (current.orders[0]?.number ?? 1044) + 1 },
              ...current.orders,
            ].slice(0, 4),
            sales: current.sales + arrival.amount,
            toShip: current.toShip + (arrival.todo ? 1 : 0),
            arrived: current.arrived + 1,
          };
        }),
      arrivalDelay(state.arrived),
    );
    return () => clearTimeout(timer);
  }, [active, reduce, state.arrived]);
  return state;
}

/** La première commande arrive vite, les suivantes laissent le temps de lire. */
function arrivalDelay(arrived: number) {
  return arrived === 0 ? 1600 : 3600;
}

/** Une ligne de commande qui arrive : elle s'ouvre en haut de la liste, avec un éclat orange qui s'éteint. */
const ARRIVE = {
  initial: {
    opacity: 0,
    scale: 0.86,
    backgroundColor: 'rgba(246, 107, 33, 0.22)',
  },
  animate: { opacity: 1, scale: 1, backgroundColor: 'rgba(246, 107, 33, 0)' },
  exit: { opacity: 0, transition: { duration: 0.2 } },
  transition: {
    opacity: { duration: 0.35 },
    scale: { type: 'spring', stiffness: 420, damping: 32 },
    backgroundColor: { duration: 2.2, ease: 'easeOut' },
    layout: { type: 'spring', stiffness: 380, damping: 36 },
  },
} as const;

/** Le tableau de bord du marchand, en thème sombre : la même boutique, le même stock. */
export function DashboardScreen({ className }: { className?: string }) {
  const { name } = useShownName();
  const slug = storeSlug(name) || 'votre-boutique';
  const screen = useRef<HTMLDivElement>(null);
  const live = useLiveOrders(useInView(screen, { amount: 0.5 }));
  return (
    <div
      ref={screen}
      className={`ul-device flex h-[480px] w-[760px] overflow-hidden rounded-[14px] text-[12px] text-[#e9e6e0] ${className ?? ''}`}
    >
      <aside className="flex w-[176px] shrink-0 flex-col gap-0.5 border-r border-white/[0.06] bg-[#0b0a0d] p-3">
        <span className="flex items-center gap-[0.3em] px-1.5 pt-1 pb-3 text-[17px] text-[#f5f1ea]">
          <UpsellMark className="h-[1.15em] w-auto" />
          <UpsellWordmark className="translate-y-[0.14em]" />
        </span>
        <span className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-white/[0.06]">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#2a2620] text-[11px] font-[700]">
            {name.slice(0, 1).toUpperCase() || 'V'}
          </span>
          <span className="min-w-0 flex-1 truncate font-[600]">{name}</span>
          <ChevronsUpDown className="size-3.5 text-[#8b857d]" />
        </span>
        {NAV.map((section) => (
          <div key={section.group ?? 'accueil'} className="flex flex-col">
            {section.group && (
              <span className="px-2 pt-2.5 pb-1 text-[10.5px] font-[600] text-[#8b857d]">
                {section.group}
              </span>
            )}
            {section.items.map((item) => (
              <span
                key={item.label}
                className={`flex h-7 items-center gap-2.5 rounded-md px-2 ${
                  'active' in item && item.active
                    ? 'bg-white/[0.08] font-[600] text-[#f5f1ea]'
                    : 'text-[#b4aea5]'
                }`}
              >
                <item.icon className="size-[15px]" strokeWidth={1.8} />
                {item.label}
              </span>
            ))}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-4 bg-[#111013] p-5">
        <div className="flex items-center justify-between">
          <span className="text-[19px] font-[720] tracking-[-0.02em]">
            Accueil
          </span>
          <span className="flex rounded-lg bg-white/[0.04] p-0.5 text-[11px] ring-1 ring-white/[0.06]">
            {['Aujourd’hui', '7 jours', '30 jours'].map((period, index) => (
              <span
                key={period}
                className={`rounded-md px-2.5 py-1 ${index === 0 ? 'bg-white/[0.1] font-[600]' : 'text-[#8b857d]'}`}
              >
                {period}
              </span>
            ))}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Ventes">
            <Rolling value={live.sales} />
            <span className="ml-1.5 text-[12px] text-[#8b857d]">FCFA</span>
          </Tile>
          <Tile label="À expédier" todo>
            <Rolling value={live.toShip} />
          </Tile>
          <Tile label="Stock bas">
            <Rolling value={2} />
          </Tile>
        </div>
        <div className="flex flex-col rounded-xl ring-1 ring-white/[0.07]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
            <span className="font-[650]">Dernières commandes</span>
            <span className="text-[11px] text-[#8b857d]">Tout voir</span>
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {live.orders.map((order) => (
              <motion.div
                key={order.number}
                layout
                {...ARRIVE}
                className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1.25fr)_74px_96px] items-center gap-3 border-b border-white/[0.04] px-3.5 py-2 last:border-0"
              >
                <span className="text-[#8b857d] tabular-nums">
                  #{order.number}
                </span>
                <span className="truncate font-[600]">{order.customer}</span>
                <span className="truncate text-[#b4aea5]">{order.item}</span>
                <span className="text-right tabular-nums">
                  {money(order.amount)}
                </span>
                <span className="flex items-center justify-end gap-1.5 text-[11px] text-[#b4aea5]">
                  <span
                    className={`size-1.5 rounded-full ${order.todo ? 'bg-[#f66b21]' : 'bg-[#e9e6e0]'}`}
                  />
                  {order.status}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 ring-1 ring-white/[0.06]">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="size-1.5 rounded-full bg-[#e9e6e0] shadow-[0_0_8px_rgb(255_255_255/0.6)]" />
            <span className="font-[600]">Site en ligne</span>
            <span className="truncate text-[#8b857d] tabular-nums">
              {slug}.{ROOT_DOMAIN}
            </span>
          </span>
          <span className="rounded-md px-2.5 py-1 text-[11px] font-[600] ring-1 ring-white/[0.12]">
            Personnaliser
          </span>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  todo = false,
  children,
}: {
  label: string;
  todo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/[0.06]">
      <span className="flex items-center gap-1.5 text-[11px] font-[600] text-[#8b857d]">
        {todo && <span className="size-1.5 rounded-full bg-[#f66b21]" />}
        {label}
      </span>
      <span className="flex items-baseline text-[24px] leading-none font-[320] tracking-[-0.02em]">
        {children}
      </span>
    </div>
  );
}

/** Le même tableau de bord, au téléphone : ce que le marchand regarde entre deux clients (données d'exemple). */
export function DashboardPhone({ className }: { className?: string }) {
  const { name } = useShownName();
  const screen = useRef<HTMLDivElement>(null);
  const live = useLiveOrders(useInView(screen, { amount: 0.6 }));
  return (
    <div
      ref={screen}
      className={`ul-device h-[560px] w-[270px] rounded-[44px] p-[9px] ${className ?? ''}`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[35px] bg-[#111013] text-[12px] text-[#e9e6e0]">
        <span className="absolute top-2 left-1/2 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black" />
        <div className="flex items-center justify-between px-6 pt-[11px] text-[11px] font-[650] tabular-nums">
          <span>18:42</span>
          <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-white/60 p-[1.5px]">
            <span className="block h-full w-[70%] rounded-[1.5px] bg-white" />
          </span>
        </div>
        <div className="flex items-center gap-2 px-3.5 pt-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#2a2620] text-[11px] font-[700]">
            {name.slice(0, 1).toUpperCase() || 'V'}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-[650]">
            {name}
          </span>
          <ChevronsUpDown className="size-3.5 text-[#8b857d]" />
        </div>
        <div className="flex flex-1 flex-col gap-2.5 px-3.5 pt-4">
          <span className="text-[18px] font-[720] tracking-[-0.02em]">
            Accueil
          </span>
          <div className="flex flex-col gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
            <span className="text-[10.5px] font-[600] text-[#8b857d]">
              Ventes · aujourd’hui
            </span>
            <span className="flex items-baseline text-[24px] leading-none font-[320] tracking-[-0.02em]">
              <Rolling value={live.sales} />
              <span className="ml-1.5 text-[11px] text-[#8b857d]">FCFA</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="À expédier" todo>
              <Rolling value={live.toShip} />
            </Tile>
            <Tile label="Stock bas">
              <Rolling value={2} />
            </Tile>
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-white/[0.07]">
            <AnimatePresence initial={false} mode="popLayout">
              {live.orders.slice(0, 3).map((order) => (
                <motion.div
                  key={order.number}
                  layout
                  {...ARRIVE}
                  className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-2 last:border-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-[600]">
                      #{order.number} · {order.customer}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10.5px] text-[#8b857d]">
                      <span
                        className={`size-1.5 rounded-full ${order.todo ? 'bg-[#f66b21]' : 'bg-[#e9e6e0]'}`}
                      />
                      {order.status}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {money(order.amount)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-white/[0.07] bg-[#0b0a0d] px-2 pt-2 pb-5 text-[9.5px]">
          {PHONE_NAV.map((item) => (
            <span
              key={item.label}
              className={`flex flex-col items-center gap-1 ${item.active ? 'text-[#f5f1ea]' : 'text-[#8b857d]'}`}
            >
              <item.icon className="size-[17px]" strokeWidth={1.8} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const PHONE_NAV = [
  { label: 'Accueil', icon: House, active: true },
  { label: 'Commandes', icon: ReceiptText, active: false },
  { label: 'Produits', icon: Package, active: false },
  { label: 'Site', icon: Store, active: false },
];
