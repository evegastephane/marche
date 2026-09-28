import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { UpsellLogo } from '@/shared/ui/brand';
import { buttonClasses } from '@/shared/ui/button';
import { Reveal } from '@/shared/ui/motion';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
});

/** 404 : l'afficheur roule jusqu'au code d'erreur. */
function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-6 sm:px-16">
      <Reveal>
        <UpsellLogo intro className="text-[1.5rem]" />
      </Reveal>
      <Reveal delay={0.1} className="display-window flex flex-col gap-3 rounded-2xl px-7 py-6">
        <span className="legend text-display-dim">Erreur</span>
        <AnimatedNumber value={404} format={(n) => String(Math.round(n))} className="readout text-[5rem] sm:text-[6rem]" />
      </Reveal>
      <Reveal delay={0.2} className="flex flex-col gap-2">
        <h1 className="display text-[2rem] sm:text-[2.5rem]">Page introuvable</h1>
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
