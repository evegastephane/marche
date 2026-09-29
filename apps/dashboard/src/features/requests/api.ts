import type {
  DeclineSpecialRequestInput,
  Paginated,
  QuoteSpecialRequestInput,
  SpecialRequestDto,
  SpecialRequestStatus,
} from '@marche/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export type RequestFilter = 'all' | SpecialRequestStatus;

export function useRequestList(filter: RequestFilter) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.requestList(store, { filter }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<SpecialRequestDto>>('GET', '/api/v1/special-requests', {
        signal,
        query: { status: filter === 'all' ? undefined : filter, cursor: pageParam, limit: 30 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useRequest(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.request(store, id),
    queryFn: ({ signal }) => api<SpecialRequestDto>('GET', `/api/v1/special-requests/${id}`, { signal }),
  });
}

/** Demandes à traiter : témoin orange du menu. */
export function useRequestSummary() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.requestSummary(store),
    queryFn: ({ signal }) => api<{ newCount: number }>('GET', '/api/v1/special-requests/summary', { signal }),
    enabled: store !== 'aucune',
    staleTime: 60_000,
  });
}

type RequestAction =
  | { action: 'quote'; input: QuoteSpecialRequestInput }
  | { action: 'decline'; input: DeclineSpecialRequestInput }
  | { action: 'convert' };

/** Devis, refus ou transformation en commande : la demande mise à jour remplace le cache. */
export function useRequestAction(id: string) {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: RequestAction) =>
      api<SpecialRequestDto>('POST', `/api/v1/special-requests/${id}/${change.action}`, {
        body: 'input' in change ? change.input : undefined,
      }),
    onSuccess: async (request) => {
      queryClient.setQueryData(qk.request(store, id), request);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...qk.requests(store), 'list'] }),
        queryClient.invalidateQueries({ queryKey: qk.requestSummary(store) }),
        queryClient.invalidateQueries({ queryKey: qk.orders(store) }),
      ]);
    },
  });
}
