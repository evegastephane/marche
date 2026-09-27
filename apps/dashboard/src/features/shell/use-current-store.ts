import type { StoreDto } from '@marche/contracts';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

/** Boutique de l'organisation active (nom, devise, adresse du site…). */
export function useCurrentStore() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.store(store),
    queryFn: ({ signal }) => api<StoreDto>('GET', '/api/v1/stores/current', { signal }),
    enabled: store !== 'aucune',
    staleTime: 5 * 60_000,
  });
}
