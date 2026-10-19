import type {
  CashMovementInput,
  ClosePosSessionInput,
  OpenPosSessionInput,
  Paginated,
  PosCreditDto,
  PosLookupDto,
  PosQuoteDto,
  PosQuoteInput,
  PosReturnInput,
  PosReturnResultDto,
  PosSaleDto,
  PosSaleInput,
  PosSessionDetailDto,
  PosSessionDto,
  PosSessionStatus,
  PosSettings,
  PosVariantDto,
  UpdatePosSettingsInput,
} from '@marche/contracts';
import { useOrganization } from '@clerk/react';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

/** Administrateur de la boutique (rôle Clerk « admin ») : remises libres, remboursements en argent, réglages. */
export function useIsStoreAdmin(): boolean {
  const { membership } = useOrganization();
  return membership?.role === 'org:admin';
}

export function usePosSettings() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.posSettings(store),
    queryFn: ({ signal }) => api<PosSettings>('GET', '/api/v1/pos/settings', { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useUpdatePosSettings() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePosSettingsInput) => api<PosSettings>('PUT', '/api/v1/pos/settings', { body: input }),
    onSuccess: (settings) => queryClient.setQueryData(qk.posSettings(store), settings),
  });
}

/** Caisse ouverte du vendeur connecté (null : il doit en ouvrir une). */
export function useCurrentSession() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.posCurrent(store),
    queryFn: async ({ signal }) => (await api<{ session: PosSessionDto | null }>('GET', '/api/v1/pos/session', { signal })).session,
  });
}

export function usePosSession(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.posSession(store, id),
    queryFn: ({ signal }) => api<PosSessionDetailDto>('GET', `/api/v1/pos/sessions/${id}`, { signal }),
  });
}

export function usePosSessions(status: PosSessionStatus | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.posSessions(store, { status }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<PosSessionDto>>('GET', '/api/v1/pos/sessions', { signal, query: { status, cursor: pageParam, limit: 25 } }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

/** Avoirs disponibles (retours remboursés en avoir) de la caisse ouverte. */
export function usePosCredits(sessionId: string | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.posCredits(store, sessionId ?? 'aucune'),
    queryFn: ({ signal }) => api<PosCreditDto[]>('GET', `/api/v1/pos/sessions/${sessionId}/credits`, { signal }),
    enabled: Boolean(sessionId),
  });
}

/** Rafraîchit tout ce que touche un encaissement : la caisse, les commandes, le stock, l'accueil. */
function useRefreshAfterSale() {
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.pos(store) }),
      queryClient.invalidateQueries({ queryKey: qk.orders(store) }),
      queryClient.invalidateQueries({ queryKey: qk.customers(store) }),
      queryClient.invalidateQueries({ queryKey: ['store', store, 'inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['store', store, 'reporting'] }),
      queryClient.invalidateQueries({ queryKey: qk.products(store) }),
    ]);
}

export function useOpenSession() {
  const api = useApi();
  const refresh = useRefreshAfterSale();
  return useMutation({
    mutationFn: (input: OpenPosSessionInput) => api<PosSessionDto>('POST', '/api/v1/pos/sessions', { body: input }),
    onSuccess: () => refresh(),
  });
}

export function useCloseSession() {
  const api = useApi();
  const refresh = useRefreshAfterSale();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClosePosSessionInput }) =>
      api<PosSessionDetailDto>('POST', `/api/v1/pos/sessions/${id}/close`, { body: input }),
    onSuccess: () => refresh(),
  });
}

export function useCashMovement() {
  const api = useApi();
  const refresh = useRefreshAfterSale();
  return useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: string; input: CashMovementInput }) =>
      api<PosSessionDetailDto>('POST', `/api/v1/pos/sessions/${sessionId}/movements`, { body: input }),
    onSuccess: () => refresh(),
  });
}

/** Articles du comptoir : recherche par nom, SKU, code-barres ou marque (liste complète sans recherche). */
export function usePosVariants(q: string) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.posVariants(store, q),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<PosVariantDto>>('GET', '/api/v1/pos/variants', { signal, query: { q: q || undefined, cursor: pageParam, limit: 24 } }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

/** Total exact du ticket (remises des packs et de caisse), recalculé quand le ticket change. */
export function usePosQuote(input: PosQuoteInput | null) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: [...qk.pos(store), 'quote', input],
    queryFn: ({ signal }) => api<PosQuoteDto>('POST', '/api/v1/pos/quote', { signal, body: input }),
    enabled: input !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
}

/** Lecture au scanner : code-barres, SKU ou IMEI. */
export function usePosLookup() {
  const api = useApi();
  return useMutation({
    mutationFn: (code: string) => api<PosLookupDto>('GET', '/api/v1/pos/lookup', { query: { code } }),
  });
}

/** Encaisser : la clé d'idempotence protège contre le double appui sur « Valider ». */
export function useCreateSale() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterSale();
  return useMutation({
    mutationFn: ({ input, key }: { input: PosSaleInput; key: string }) =>
      api<PosSaleDto>('POST', '/api/v1/pos/sales', { body: input, idempotencyKey: key }),
    onSuccess: (sale) => {
      queryClient.setQueryData(qk.posSale(store, sale.order.id), sale);
      void refresh();
    },
  });
}

export function usePosSale(orderId: string | null) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.posSale(store, orderId ?? 'aucune'),
    queryFn: ({ signal }) => api<PosSaleDto>('GET', `/api/v1/pos/sales/${orderId}`, { signal }),
    enabled: Boolean(orderId),
  });
}

export function useCreateReturn() {
  const api = useApi();
  const refresh = useRefreshAfterSale();
  return useMutation({
    mutationFn: ({ orderId, input, key }: { orderId: string; input: PosReturnInput; key: string }) =>
      api<PosReturnResultDto>('POST', `/api/v1/pos/sales/${orderId}/returns`, { body: input, idempotencyKey: key }),
    onSuccess: () => refresh(),
  });
}

/** Retrouver une vente par son numéro de ticket (retour d'un ticket d'une autre journée). */
export function useFindSaleByNumber() {
  const api = useApi();
  return useMutation({
    mutationFn: async (number: number) => {
      const page = await api<Paginated<{ orderId: string }>>('GET', '/api/v1/pos/sales', { query: { number, limit: 1 } });
      const found = page.items[0];
      if (!found) return null;
      return api<PosSaleDto>('GET', `/api/v1/pos/sales/${found.orderId}`);
    },
  });
}
