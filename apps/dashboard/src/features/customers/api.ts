import type { CustomerDetailDto, CustomerDto, Paginated } from '@marche/contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export function useCustomerList(q: string | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.customerList(store, { q }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<CustomerDto>>('GET', '/api/v1/customers', { signal, query: { q, cursor: pageParam, limit: 30 } }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useCustomer(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.customer(store, id),
    queryFn: ({ signal }) => api<CustomerDetailDto>('GET', `/api/v1/customers/${id}`, { signal }),
  });
}

/** « Awa Diop », sinon l'e-mail. */
export function customerName(customer: Pick<CustomerDto, 'firstName' | 'lastName' | 'email'>): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
}
