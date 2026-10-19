import { createFileRoute, redirect } from '@tanstack/react-router';

/** Les catalogues ont quitté le dashboard : les produits se rangent par catégorie. Anciens liens → Produits. */
export const Route = createFileRoute('/_app/collections/')({
  beforeLoad: () => {
    throw redirect({ to: '/products', replace: true });
  },
});
