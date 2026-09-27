import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import logo from '@/assets/brand/baobab-logo.png';
import { buttonClasses } from '@/shared/ui/button';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-6 sm:px-16">
      <img src={logo} alt="Baobab" className="h-7 w-auto" />
      <h1 className="lettrage text-[4rem] text-baobab sm:text-[6rem]">Page introuvable</h1>
      <p className="max-w-[48ch] text-encre-2">Cette adresse ne mène à aucune page du tableau de bord.</p>
      <Link to="/" className={buttonClasses('primaire')}>
        Retour à l’accueil
      </Link>
    </div>
  );
}
