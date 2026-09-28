import type {
  CollectionDetailDto,
  CollectionDto,
  CreateCollectionInput,
  Paginated,
  UpdateCollectionInput,
} from '@marche/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export function useCollectionList(q: string | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.collectionList(store, { q }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<CollectionDto>>('GET', '/api/v1/collections', {
        signal,
        query: { q, cursor: pageParam, limit: 50 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useCollection(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.collection(store, id),
    queryFn: ({ signal }) => api<CollectionDetailDto>('GET', `/api/v1/collections/${id}`, { signal }),
  });
}

export function useCreateCollection() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollectionInput) => api<CollectionDto>('POST', '/api/v1/collections', { body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.collections(store) }),
  });
}

/**
 * Enregistre un catalogue : ses champs (si modifiés) puis la liste ordonnée de ses produits.
 * Le détail renvoyé remplace le cache ; les listes et les produits se rafraîchissent.
 */
export function useSaveCollection(id: string) {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fields, productIds }: { fields?: UpdateCollectionInput; productIds?: string[] }) => {
      if (fields && Object.keys(fields).length > 0) {
        await api<CollectionDto>('PATCH', `/api/v1/collections/${id}`, { body: fields });
      }
      if (productIds) {
        await api('PUT', `/api/v1/collections/${id}/products`, { body: { productIds } });
      }
      return api<CollectionDetailDto>('GET', `/api/v1/collections/${id}`);
    },
    onSuccess: async (detail) => {
      queryClient.setQueryData(qk.collection(store, id), detail);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...qk.collections(store), 'list'] }),
        queryClient.invalidateQueries({ queryKey: qk.products(store) }),
      ]);
    },
  });
}

export function useDeleteCollection() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>('DELETE', `/api/v1/collections/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.collections(store) }),
  });
}
