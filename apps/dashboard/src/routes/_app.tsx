import { useAuth } from '@clerk/react';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { Store } from 'lucide-react';
import { AppShell } from '@/features/shell/app-shell';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError } from '@/shared/api/client';
import { IconBadge } from '@/shared/ui/badge';
import { UpsellLogo } from '@/shared/ui/brand';
import { buttonClasses } from '@/shared/ui/button';
import { Reveal } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app')({ component: AppLayout });

function AppLayout() {
  const { isLoaded, isSignedIn, orgId } = useAuth({
    treatPendingAsSignedOut: false,
  });
  if (!isLoaded) return <ShellPlaceholder />;
  if (!isSignedIn) return <Navigate to="/sign-in/$" params={{ _splat: '' }} replace />;
  if (!orgId) return <Navigate to="/onboarding" replace />;
  return <StoreGate />;
}

/** Une organisation Clerk créée hors d'Upsell n'a pas de boutique : on propose d'en ouvrir une. */
function StoreGate() {
  const store = useCurrentStore();
  if (store.error instanceof ApiError && store.error.code === 'STORE_REQUIRED') {
    return (
      <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-6 sm:px-16">
        <Reveal>
          <UpsellLogo intro className="text-[1.375rem]" />
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col items-start gap-4">
          <IconBadge icon={Store} size="lg" />
          <h1 className="display text-[2.25rem] sm:text-[3rem]">Pas encore de boutique ici</h1>
          <p className="max-w-[52ch] text-ink-2">
            Cette organisation n’a pas de boutique Upsell. Ouvrez-en une, ou choisissez une autre organisation.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <Link to="/onboarding" className={buttonClasses('primary', 'lg')}>
            Ouvrir une boutique
          </Link>
        </Reveal>
      </div>
    );
  }
  return <AppShell />;
}

function ShellPlaceholder() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <div className="hidden border-r border-line bg-surface lg:block" />
      <div className="h-14 border-b border-line bg-surface lg:hidden" />
    </div>
  );
}
