import type {
  AdjustStockInput,
  InventoryItemDto,
  InventoryLevelDto,
  Paginated,
  StockMovementDto,
} from '@marche/contracts';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export type InventoryFilter = 'all' | 'low' | 'out';

export function useInventoryList(filter: InventoryFilter, q: string | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.inventoryList(store, { filter, q }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<InventoryItemDto>>('GET', '/api/v1/inventory', {
        signal,
        query: { filter, q, cursor: pageParam, limit: 40 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useMovements(variantId: string | null) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.movements(store, variantId ?? 'aucune'),
    enabled: variantId !== null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<StockMovementDto>>('GET', `/api/v1/inventory/${variantId}/movements`, {
        signal,
        query: { cursor: pageParam, limit: 20 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

/** Tout ce qui touche au stock rafraîchit l'inventaire, les produits et les chiffres de l'accueil. */
function useInvalidateStock() {
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['store', store, 'inventory'] }),
      queryClient.invalidateQueries({ queryKey: qk.products(store) }),
      queryClient.invalidateQueries({ queryKey: ['store', store, 'reporting'] }),
    ]);
}

export function useAdjustStock() {
  const api = useApi();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ variantId, input }: { variantId: string; input: AdjustStockInput }) =>
      api<InventoryLevelDto>('POST', `/api/v1/inventory/${variantId}/adjustments`, { body: input }),
    onSuccess: invalidate,
  });
}

export function useSetThreshold() {
  const api = useApi();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ variantId, lowStockThreshold }: { variantId: string; lowStockThreshold: number | null }) =>
      api<InventoryLevelDto>('PUT', `/api/v1/inventory/${variantId}/threshold`, { body: { lowStockThreshold } }),
    onSuccess: invalidate,
  });
}
