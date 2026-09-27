import { OrganizationSwitcher, UserButton } from '@clerk/react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { House, type LucideIcon, Package, ReceiptText, Store } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import emblemeTrait from '@/assets/brand/baobab-embleme-trait.png';
import logoBlanc from '@/assets/brand/baobab-logo-blanc.png';
import { onGreen } from '@/app/clerk-appearance';
import { cn } from '@/shared/lib/cn';

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
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_1fr]">
      <Sidebar />
      <MobileHeader />
      <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        <PageTransition />
      </main>
      <BottomNav />
    </div>
  );
}

/** Le contenu de la page glisse à peine en arrivant : un changement d'état, pas une chorégraphie. */
function PageTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      className="mx-auto w-full max-w-[76rem]"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Outlet />
    </motion.div>
  );
}

function Sidebar() {
  return (
    <aside className="sur-vert sticky top-0 hidden h-dvh flex-col bg-baobab text-white lg:flex">
      <div className="px-6 pt-7 pb-6">
        <img src={logoBlanc} alt="Baobab" className="h-8 w-auto" />
      </div>
      <div className="mx-3 border-y border-white/15 py-2">
        <OrganizationSwitcher {...switcherProps} appearance={onGreen} />
      </div>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="group relative flex h-12 items-center gap-3 rounded-lg px-2 text-[0.9375rem] font-[620] text-white/88 no-underline transition-colors duration-150 hover:bg-white/8 hover:text-white"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-actif"
                    className="absolute inset-0 rounded-lg bg-jaune"
                    transition={{ type: 'spring', bounce: 0.14, duration: 0.34 }}
                  />
                )}
                <NavDisc icon={item.icon} active={isActive} />
                <span className={cn('relative', isActive && 'text-encre')}>{item.label}</span>
              </>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/15 px-4 py-4">
        <UserButton showName appearance={onGreen} />
      </div>
    </aside>
  );
}

function NavDisc({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex size-8 items-center justify-center rounded-full transition-colors duration-150',
        active ? 'bg-baobab text-white' : 'bg-white/10 text-white',
      )}
    >
      <span className="absolute inset-[2.5px] rounded-full border-[1.5px] border-white/80" />
      <Icon className="size-4" strokeWidth={2.2} />
    </span>
  );
}

function MobileHeader() {
  return (
    <header className="sur-vert sticky top-0 z-30 flex h-14 items-center gap-2 bg-baobab px-3 text-white lg:hidden">
      <img src={emblemeTrait} alt="Baobab" className="size-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <OrganizationSwitcher {...switcherProps} appearance={onGreen} />
      </div>
      <UserButton appearance={onGreen} />
    </header>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="sur-vert fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 bg-baobab px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-white lg:hidden"
    >
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === '/' }}
          className="flex flex-col items-center gap-1 rounded-lg py-1 text-[0.75rem] font-[640] text-white/85 no-underline"
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden
                className={cn(
                  'relative inline-flex size-9 items-center justify-center rounded-full transition-colors duration-150',
                  isActive ? 'bg-jaune text-encre' : 'text-white',
                )}
              >
                <span
                  className={cn(
                    'absolute inset-[2.5px] rounded-full border-[1.5px]',
                    isActive ? 'border-encre/60' : 'border-white/70',
                  )}
                />
                <item.icon className="size-[1.05rem]" strokeWidth={2.2} />
              </span>
              <span className={cn(isActive && 'text-white')}>{item.label}</span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}
