import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  Boxes,
  House,
  Layers,
  type LucideIcon,
  Megaphone,
  Menu,
  Package,
  ReceiptText,
  Settings,
  Store,
  Tag,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useOverview } from '@/features/home/api';
import { cn } from '@/shared/lib/cn';
import { Led } from '@/shared/ui/badge';
import { UpsellLogo, UpsellMark } from '@/shared/ui/brand';
import { Dialog } from '@/shared/ui/dialog';
import { EASE_OUT, glide, staggerParent } from '@/shared/ui/motion';
import { ThemeSwitch, ThemeToggle } from '@/shared/ui/theme';
import { AccountMenu } from './account-menu';
import { StoreSwitcher } from './store-switcher';

type NavTo =
  | '/'
  | '/orders'
  | '/customers'
  | '/campaigns'
  | '/products'
  | '/inventory'
  | '/collections'
  | '/brands'
  | '/site'
  | '/settings';

interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: null, items: [{ to: '/', label: 'Accueil', icon: House }] },
  {
    label: 'Vendre',
    items: [
      { to: '/orders', label: 'Commandes', icon: ReceiptText },
      { to: '/customers', label: 'Clients', icon: Users },
      { to: '/campaigns', label: 'Campagnes', icon: Megaphone },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/products', label: 'Produits', icon: Package },
      { to: '/inventory', label: 'Stock', icon: Boxes },
      { to: '/collections', label: 'Catalogues', icon: Layers },
      { to: '/brands', label: 'Marques', icon: Tag },
    ],
  },
  {
    label: 'Boutique',
    items: [
      { to: '/site', label: 'Site', icon: Store },
      { to: '/settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

/** Les quatre touches du téléphone ; le reste s'ouvre avec « Plus ». */
const PHONE_KEYS: NavItem[] = [
  { to: '/', label: 'Accueil', icon: House },
  { to: '/orders', label: 'Commandes', icon: ReceiptText },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/site', label: 'Site', icon: Store },
];

/** Témoin orange sur « Commandes » tant qu'il reste des commandes à expédier. */
function useAttention(): Partial<Record<NavTo, number>> {
  const overview = useOverview('30d');
  const toShip = overview.data?.ordersToFulfill ?? 0;
  return toShip > 0 ? { '/orders': toShip } : {};
}

export function AppShell() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <Sidebar />
      <MobileHeader />
      <main className="min-w-0 px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-9 lg:pb-16">
        <PageTransition />
      </main>
      <BottomNav />
    </div>
  );
}

/**
 * À chaque changement de page, le contenu repart de zéro : les blocs de la page
 * (en-tête, faces) montent l'un après l'autre grâce à leurs variantes `riseIn`.
 */
function PageTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.div
      key={pathname}
      className="mx-auto w-full max-w-[72rem]"
      variants={staggerParent(0.04)}
      initial="hidden"
      animate="show"
    >
      <Outlet />
    </motion.div>
  );
}

/** Touche de navigation : le curseur (`knob`) glisse sous la page active. */
function NavKey({
  item,
  knob,
  attention,
  onNavigate,
}: {
  item: NavItem;
  knob: string;
  attention?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === '/' }}
      onClick={onNavigate}
      className="group relative flex h-10 items-center gap-3 rounded-[0.7rem] px-3 text-[0.9375rem] font-[560] text-ink-2 no-underline transition-colors duration-200 hover:text-ink max-lg:h-12"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={knob}
              className="absolute inset-0 rounded-[0.7rem] bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
              transition={glide}
            />
          )}
          <item.icon
            className={cn('relative size-[1.125rem] transition-colors', isActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink')}
            strokeWidth={1.8}
          />
          <span className={cn('relative flex-1', isActive && 'text-ink')}>{item.label}</span>
          {attention !== undefined && (
            <span className="relative flex items-center gap-2">
              <span className="tabular text-[0.8125rem] font-[500] text-ink-2">{attention}</span>
              <Led tone="attention" />
              <span className="sr-only">à expédier</span>
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function NavGroups({ knob, onNavigate }: { knob: string; onNavigate?: () => void }) {
  const attention = useAttention();
  let index = 0;
  return (
    <>
      {NAV.map((group) => (
        <div key={group.label ?? 'accueil'} className="flex flex-col gap-0.5">
          {group.label && <p className="legend px-3 pt-4 pb-1.5">{group.label}</p>}
          {group.items.map((item) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.36, ease: EASE_OUT, delay: 0.15 + index++ * 0.025 }}
            >
              <NavKey item={item} knob={knob} attention={attention[item.to]} onNavigate={onNavigate} />
            </motion.div>
          ))}
        </div>
      ))}
    </>
  );
}

/** Panneau de commande : logo, boutique, touches de navigation groupées, thème et compte. */
function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line lg:flex">
      <div className="px-5 pt-7 pb-5">
        <UpsellLogo intro className="text-[1.5rem]" />
      </div>
      <div className="mx-3">
        <StoreSwitcher />
      </div>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col overflow-y-auto px-3 pt-1 pb-4">
        <NavGroups knob="nav-knob" />
      </nav>
      <div className="flex flex-col gap-3 border-t border-line px-3 py-4">
        <ThemeSwitch className="self-start" />
        <AccountMenu showName side="top" align="start" />
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-line bg-canvas px-3 lg:hidden">
      <UpsellMark intro className="h-6 w-auto shrink-0 text-ink" title="Upsell" />
      <div className="min-w-0 flex-1">
        <StoreSwitcher compact />
      </div>
      <ThemeToggle />
      <AccountMenu />
    </header>
  );
}

/**
 * Rangée de touches du téléphone : le curseur glisse sous l'onglet actif, témoin orange sur Commandes.
 * « Plus » ouvre toutes les rubriques dans une feuille qui monte du bas.
 */
function BottomNav() {
  const attention = useAttention();
  const [more, setMore] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onPhoneKey = PHONE_KEYS.some((item) =>
    item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  return (
    <>
      <motion.nav
        aria-label="Navigation principale"
        initial={{ y: 72 }}
        animate={{ y: 0 }}
        transition={{ ...glide, delay: 0.1 }}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-line bg-surface px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {PHONE_KEYS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.6875rem] font-[560] text-ink-3 no-underline"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="bottom-knob" className="well absolute inset-0 rounded-xl" transition={glide} />
                )}
                <span className="relative inline-flex">
                  <item.icon className={cn('size-5', isActive && 'text-ink')} strokeWidth={1.8} />
                  {attention[item.to] !== undefined && <Led tone="attention" className="absolute -top-0.5 -right-1.5" />}
                </span>
                <span className={cn('relative', isActive && 'text-ink')}>
                  {item.label}
                  {attention[item.to] !== undefined && (
                    <span className="sr-only"> ({attention[item.to]} à expédier)</span>
                  )}
                </span>
              </>
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMore(true)}
          className="relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.6875rem] font-[560] text-ink-3"
        >
          {!onPhoneKey && (
            <motion.span layoutId="bottom-knob" className="well absolute inset-0 rounded-xl" transition={glide} />
          )}
          <Menu className={cn('relative size-5', !onPhoneKey && 'text-ink')} strokeWidth={1.8} />
          <span className={cn('relative', !onPhoneKey && 'text-ink')}>Plus</span>
        </button>
      </motion.nav>
      <Dialog open={more} onOpenChange={setMore} title="Toutes les rubriques">
        <nav aria-label="Toutes les rubriques" className="-mx-2 flex flex-col">
          <NavGroups knob="sheet-knob" onNavigate={() => setMore(false)} />
        </nav>
      </Dialog>
    </>
  );
}
