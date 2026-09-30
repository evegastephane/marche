import type {
  AdjustStockInput,
  InventoryItemDto,
  InventoryLevelDto,
  Paginated,
  ReceiveUnitsInput,
  StockMovementDto,
  StockUnitDto,
  StockUnitStatus,
  UpdateUnitInput,
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

/** Unités (IMEI) d'une variante suivie à l'unité, filtrées par état. */
export function useUnits(variantId: string | null, status: StockUnitStatus) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: ['store', store, 'inventory', 'units', variantId ?? 'aucune', status],
    enabled: variantId !== null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<StockUnitDto>>('GET', `/api/v1/inventory/${variantId}/units`, {
        signal,
        query: { status, cursor: pageParam, limit: 50 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useReceiveUnits() {
  const api = useApi();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ variantId, input }: { variantId: string; input: ReceiveUnitsInput }) =>
      api<InventoryLevelDto>('POST', `/api/v1/inventory/${variantId}/units`, { body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateUnit() {
  const api = useApi();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ unitId, input }: { unitId: string; input: UpdateUnitInput }) =>
      api<StockUnitDto>('PATCH', `/api/v1/inventory/units/${unitId}`, { body: input }),
    onSuccess: invalidate,
  });
}

/** Sortie (perte, vol, défaut) ou retour en stock d'une unité, avec son motif. */
export function useUnitMovement() {
  const api = useApi();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ unitId, action, reason }: { unitId: string; action: 'remove' | 'return'; reason: string }) =>
      api<StockUnitDto>('POST', `/api/v1/inventory/units/${unitId}/${action}`, { body: { reason } }),
    onSuccess: invalidate,
  });
}
