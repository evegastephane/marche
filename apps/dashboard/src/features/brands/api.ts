import type { BrandDto, CreateBrandInput, Paginated, UpdateBrandInput } from '@marche/contracts';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export function useBrandList(q: string | undefined, includeArchived: boolean) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.brandList(store, { q, includeArchived }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<BrandDto>>('GET', '/api/v1/brands', {
        signal,
        query: { q, includeArchived, cursor: pageParam, limit: 50 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export type BrandMutation =
  | { type: 'create'; input: CreateBrandInput }
  | { type: 'update'; id: string; input: UpdateBrandInput }
  | { type: 'archive' | 'restore'; id: string };

/** Créer, modifier, archiver, restaurer : les listes de marques (et le sélecteur du produit) se rafraîchissent. */
export function useBrandMutation() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (m: BrandMutation) => {
      switch (m.type) {
        case 'create':
          return api<BrandDto>('POST', '/api/v1/brands', { body: m.input });
        case 'update':
          return api<BrandDto>('PATCH', `/api/v1/brands/${m.id}`, { body: m.input });
        default:
          return api<BrandDto>('POST', `/api/v1/brands/${m.id}/${m.type}`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.brands(store) }),
  });
}
