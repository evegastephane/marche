import { useAuth } from '@clerk/react';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { Store } from 'lucide-react';
import logo from '@/assets/brand/baobab-logo.png';
import { AppShell } from '@/features/shell/app-shell';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError } from '@/shared/api/client';
import { buttonClasses } from '@/shared/ui/button';
import { Pastille } from '@/shared/ui/pastille';

export const Route = createFileRoute('/_app')({ component: AppLayout });

function AppLayout() {
  const { isLoaded, isSignedIn, orgId } = useAuth({ treatPendingAsSignedOut: false });
  if (!isLoaded) return <ShellPlaceholder />;
  if (!isSignedIn) return <Navigate to="/sign-in/$" params={{ _splat: '' }} replace />;
  if (!orgId) return <Navigate to="/onboarding" replace />;
  return <StoreGate />;
}

/** Une organisation Clerk créée hors de Baobab n'a pas de boutique : on propose d'en ouvrir une. */
function StoreGate() {
  const store = useCurrentStore();
  if (store.error instanceof ApiError && store.error.code === 'STORE_REQUIRED') {
    return (
      <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-6 sm:px-16">
        <img src={logo} alt="Baobab" className="h-7 w-auto" />
        <Pastille icon={Store} size="lg" />
        <h1 className="lettrage text-[3.5rem] text-baobab">Pas encore de boutique ici</h1>
        <p className="max-w-[52ch] text-encre-2">
          Cette organisation n’a pas de boutique Baobab. Ouvrez-en une, ou choisissez une autre organisation.
        </p>
        <Link to="/onboarding" className={buttonClasses('primaire', 'lg')}>
          Ouvrir une boutique
        </Link>
      </div>
    );
  }
  return <AppShell />;
}

function ShellPlaceholder() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_1fr]">
      <div className="hidden bg-baobab lg:block" />
      <div className="h-14 bg-baobab lg:hidden" />
    </div>
  );
}
