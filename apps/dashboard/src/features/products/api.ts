import type {
  BrandDto,
  CreateProductInput,
  Paginated,
  ProductDto,
  ProductListItemDto,
  UpdateProductInput,
} from '@marche/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';
import type { ProductFilter } from './status';

export function useProductList(filter: ProductFilter, q: string | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useInfiniteQuery({
    queryKey: qk.productList(store, { filter, q }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<ProductListItemDto>>('GET', '/api/v1/products', {
        signal,
        query: { status: filter === 'all' ? undefined : filter, q, cursor: pageParam, limit: 30 },
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useProduct(id: string) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.product(store, id),
    queryFn: ({ signal }) => api<ProductDto>('GET', `/api/v1/products/${id}`, { signal }),
  });
}

export function useBrands() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.brands(store),
    queryFn: ({ signal }) => api<Paginated<BrandDto>>('GET', '/api/v1/brands', { signal, query: { limit: 100 } }),
    staleTime: 5 * 60_000,
  });
}

/** Création ou mise à jour, puis mise en vente ou retrait selon le statut choisi. */
export function useSaveProduct() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      publish,
    }: {
      id?: string;
      input: CreateProductInput | UpdateProductInput;
      publish: boolean;
    }) => {
      let product = id
        ? await api<ProductDto>('PUT', `/api/v1/products/${id}`, { body: input })
        : await api<ProductDto>('POST', '/api/v1/products', { body: input });
      if (publish && product.status !== 'ACTIVE') {
        product = await api<ProductDto>('POST', `/api/v1/products/${product.id}/publish`);
      } else if (!publish && product.status === 'ACTIVE') {
        product = await api<ProductDto>('POST', `/api/v1/products/${product.id}/unpublish`);
      }
      return product;
    },
    onSuccess: async (product) => {
      queryClient.setQueryData(qk.product(store, product.id), product);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.products(store) }),
        queryClient.invalidateQueries({ queryKey: ['store', store, 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['store', store, 'reporting'] }),
      ]);
    },
  });
}

export function useProductStatusAction() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'unpublish' | 'archive' }) =>
      api<ProductDto>('POST', `/api/v1/products/${id}/${action}`),
    onSuccess: async (product) => {
      queryClient.setQueryData(qk.product(store, product.id), product);
      await queryClient.invalidateQueries({ queryKey: qk.products(store) });
    },
  });
}
