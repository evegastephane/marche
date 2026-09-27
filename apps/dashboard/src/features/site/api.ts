import type { CollectionDto, Paginated, SiteDto, ThemeSettings } from '@marche/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/client';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

/** Site de la boutique, ou null tant qu'il n'a pas été généré. */
export function useSite() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.site(store),
    queryFn: async ({ signal }) => {
      try {
        return await api<SiteDto>('GET', '/api/v1/site', { signal });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'NOT_FOUND') return null;
        throw error;
      }
    },
  });
}

export function useCollections() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.collections(store),
    queryFn: ({ signal }) =>
      api<Paginated<CollectionDto>>('GET', '/api/v1/collections', { signal, query: { limit: 100 } }),
    staleTime: 5 * 60_000,
  });
}

type SiteAction =
  | { type: 'generate' }
  | { type: 'publish' }
  | { type: 'unpublish' }
  | { type: 'save-theme'; settings: ThemeSettings }
  | { type: 'publish-theme' };

export function useSiteAction() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: SiteAction) => {
      switch (action.type) {
        case 'generate':
          return api<SiteDto>('POST', '/api/v1/site/generate', { body: { templateId: 'default' } });
        case 'save-theme':
          return api<SiteDto>('PUT', '/api/v1/site/theme', { body: { settings: action.settings } });
        case 'publish-theme':
          return api<SiteDto>('POST', '/api/v1/site/theme/publish');
        default:
          return api<SiteDto>('POST', `/api/v1/site/${action.type}`);
      }
    },
    onSuccess: (site) => {
      queryClient.setQueryData(qk.site(store), site);
    },
  });
}
