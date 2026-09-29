import type { BundleDto, CreateBundleInput } from '@marche/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

/** Packs de la boutique, ou ceux d'un appareil. */
export function useBundles(anchorProductId?: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.bundleList(store, { anchorProductId }),
    queryFn: ({ signal }) => api<BundleDto[]>('GET', '/api/v1/bundles', { signal, query: { anchorProductId } }),
  });
}

export function useBundle(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.bundle(store, id),
    queryFn: ({ signal }) => api<BundleDto>('GET', `/api/v1/bundles/${id}`, { signal }),
  });
}

/** Création (sans id) ou remplacement d'un pack. */
export function useSaveBundle() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CreateBundleInput }) =>
      id
        ? api<BundleDto>('PUT', `/api/v1/bundles/${id}`, { body: input })
        : api<BundleDto>('POST', '/api/v1/bundles', { body: input }),
    onSuccess: async (bundle) => {
      queryClient.setQueryData(qk.bundle(store, bundle.id), bundle);
      await queryClient.invalidateQueries({ queryKey: [...qk.bundles(store), 'list'] });
    },
  });
}

export function useDeleteBundle() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>('DELETE', `/api/v1/bundles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.bundles(store) }),
  });
}
