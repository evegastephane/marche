import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { UpsellLogo } from '@/shared/ui/brand';
import { buttonClasses } from '@/shared/ui/button';
import { Reveal } from '@/shared/ui/motion';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-6 sm:px-16">
      <Reveal>
        <UpsellLogo intro className="text-[1.375rem]" />
      </Reveal>
      <Reveal delay={0.1}>
        <p className="display text-[5rem] text-brand sm:text-[7rem]">404</p>
        <h1 className="display text-[2rem] sm:text-[2.75rem]">Page introuvable</h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="max-w-[48ch] text-ink-2">Cette adresse ne mène à aucune page du tableau de bord.</p>
      </Reveal>
      <Reveal delay={0.3}>
        <Link to="/" className={buttonClasses('primary')}>
          <ArrowLeft /> Retour à l’accueil
        </Link>
      </Reveal>
    </div>
  );
}
