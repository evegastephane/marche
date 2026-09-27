import type { InventoryItemDto, Paginated, ReportingOverviewDto, ReportingPeriod } from '@marche/contracts';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export function useOverview(period: ReportingPeriod) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.overview(store, period),
    queryFn: ({ signal }) =>
      api<ReportingOverviewDto>('GET', '/api/v1/reporting/overview', { signal, query: { period } }),
  });
}

export function useLowStock(limit = 6) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.inventory(store, `low-${limit}`),
    queryFn: ({ signal }) =>
      api<Paginated<InventoryItemDto>>('GET', '/api/v1/inventory', { signal, query: { filter: 'low', limit } }),
  });
}
