import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { ApiError } from '@/shared/api/client';
import { routeTree } from '../routeTree.gen';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Une erreur métier (4xx) ne se corrige pas en réessayant.
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
