import type { OrderDto, OrderListItemDto, Paginated } from '@marche/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';
import { filterToQuery, type OrderFilter } from './status';

export function useOrderList(filter: OrderFilter, q: string | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.orderList(store, { filter, q }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<OrderListItemDto>>('GET', '/api/v1/orders', {
        signal,
        query: { ...filterToQuery(filter), q, cursor: pageParam, limit: 25 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

/** Première page d'un filtre (accueil, compteurs des onglets). */
export function useOrderPreview(filter: OrderFilter, limit = 5) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.orderList(store, { filter, preview: limit }),
    queryFn: ({ signal }) =>
      api<Paginated<OrderListItemDto>>('GET', '/api/v1/orders', { signal, query: { ...filterToQuery(filter), limit } }),
  });
}

export function useOrder(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.order(store, id),
    queryFn: ({ signal }) => api<OrderDto>('GET', `/api/v1/orders/${id}`, { signal }),
  });
}

export type OrderAction = { type: 'mark-paid' } | { type: 'fulfill' } | { type: 'cancel'; reason: string };

/** Payer, expédier, annuler : la commande renvoyée remplace le cache, le reste est rafraîchi. */
export function useOrderAction() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: OrderAction }) =>
      api<OrderDto>('POST', `/api/v1/orders/${id}/${action.type}`, {
        body: action.type === 'cancel' ? { reason: action.reason } : undefined,
      }),
    onSuccess: async (order) => {
      queryClient.setQueryData(qk.order(store, order.id), order);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.orders(store) }),
        queryClient.invalidateQueries({ queryKey: ['store', store, 'reporting'] }),
        queryClient.invalidateQueries({ queryKey: ['store', store, 'inventory'] }),
      ]);
    },
  });
}
