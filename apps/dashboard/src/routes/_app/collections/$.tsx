import { createFileRoute, redirect } from '@tanstack/react-router';

/** Ancienne fiche d'un catalogue : les catalogues ont quitté le dashboard, on arrive sur Produits. */
export const Route = createFileRoute('/_app/collections/$')({
  beforeLoad: () => {
    throw redirect({ to: '/products', replace: true });
  },
});
