import { OrganizationSwitcher, UserButton } from '@clerk/react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { House, type LucideIcon, Package, ReceiptText, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { shellAppearance } from '@/app/clerk-appearance';
import { cn } from '@/shared/lib/cn';
import { UpsellLogo, UpsellMark } from '@/shared/ui/brand';
import { snappy, staggerParent } from '@/shared/ui/motion';
import { ThemeSwitch, ThemeToggle } from '@/shared/ui/theme';

interface NavItem {
  to: '/' | '/products' | '/orders' | '/site';
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: House },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/orders', label: 'Commandes', icon: ReceiptText },
  { to: '/site', label: 'Site', icon: Store },
];

const switcherProps = {
  hidePersonal: true,
  createOrganizationMode: 'navigation' as const,
  createOrganizationUrl: '/onboarding',
  afterSelectOrganizationUrl: '/',
};

export function AppShell() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <Sidebar />
      <MobileHeader />
      <main className="min-w-0 px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        <PageTransition />
      </main>
      <BottomNav />
    </div>
  );
}

/**
 * À chaque changement de page, le contenu repart de zéro : les blocs de la page
 * (en-tête, cartes) montent l'un après l'autre grâce à leurs variantes `riseIn`.
 */
function PageTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.div
      key={pathname}
      className="mx-auto w-full max-w-[72rem]"
      variants={staggerParent(0.06)}
      initial="hidden"
      animate="show"
    >
      <Outlet />
    </motion.div>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
      <div className="px-6 pt-7 pb-6">
        <UpsellLogo intro className="text-[1.375rem]" />
      </div>
      <div className="mx-3 border-b border-line pb-3">
        <OrganizationSwitcher {...switcherProps} appearance={shellAppearance} />
      </div>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV.map((item, index) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...snappy, delay: 0.15 + index * 0.05 }}
          >
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-[620] text-ink-2 no-underline transition-colors duration-200 hover:text-ink"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-brand-soft"
                      transition={snappy}
                    />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-bar"
                      className="absolute top-2.5 bottom-2.5 -left-3 w-1 rounded-r-full bg-brand"
                      transition={snappy}
                    />
                  )}
                  <item.icon
                    className={cn(
                      'relative size-[1.15rem] transition-[color,transform] duration-200 group-hover:-translate-y-px',
                      isActive ? 'text-brand-ink' : 'text-ink-3 group-hover:text-ink',
                    )}
                    strokeWidth={2.2}
                  />
                  <span className={cn('relative', isActive && 'text-brand-ink')}>{item.label}</span>
                </>
              )}
            </Link>
          </motion.div>
        ))}
      </nav>
      <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
        <ThemeSwitch className="self-start" />
        <UserButton showName appearance={shellAppearance} />
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-line bg-surface/80 px-3 backdrop-blur-xl lg:hidden">
      <UpsellMark intro className="h-7 w-auto shrink-0" title="Upsell" />
      <div className="min-w-0 flex-1">
        <OrganizationSwitcher {...switcherProps} appearance={shellAppearance} />
      </div>
      <ThemeToggle />
      <UserButton appearance={shellAppearance} />
    </header>
  );
}

/** Barre d'onglets flottante du téléphone : la pastille bleue glisse sous l'onglet actif. */
function BottomNav() {
  return (
    <motion.nav
      aria-label="Navigation principale"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-4 gap-1 rounded-[1.375rem] border border-line bg-surface/85 p-1.5 shadow-float backdrop-blur-xl lg:hidden"
    >
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === '/' }}
          className="relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.6875rem] font-[650] text-ink-3 no-underline"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="bottom-active"
                  className="absolute inset-0 rounded-2xl bg-brand-soft"
                  transition={snappy}
                />
              )}
              <motion.span
                aria-hidden
                className="relative inline-flex"
                animate={isActive ? { y: [0, -3, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                <item.icon className={cn('size-5', isActive && 'text-brand-ink')} strokeWidth={2.2} />
              </motion.span>
              <span className={cn('relative', isActive && 'text-brand-ink')}>{item.label}</span>
            </>
          )}
        </Link>
      ))}
    </motion.nav>
  );
}
