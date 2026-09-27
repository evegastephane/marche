/** Clés de cache TanStack Query, toujours préfixées par la boutique active (docs/PLAN-CODE.md §6.7). */
export const qk = {
  store: (store: string) => ['store', store, 'current'] as const,
  overview: (store: string, period: string) => ['store', store, 'reporting', period] as const,
  products: (store: string) => ['store', store, 'products'] as const,
  productList: (store: string, filters: object) => ['store', store, 'products', 'list', filters] as const,
  product: (store: string, id: string) => ['store', store, 'products', 'detail', id] as const,
  brands: (store: string) => ['store', store, 'brands'] as const,
  collections: (store: string) => ['store', store, 'collections'] as const,
  orders: (store: string) => ['store', store, 'orders'] as const,
  orderList: (store: string, filters: object) => ['store', store, 'orders', 'list', filters] as const,
  order: (store: string, id: string) => ['store', store, 'orders', 'detail', id] as const,
  inventory: (store: string, filter: string) => ['store', store, 'inventory', filter] as const,
  site: (store: string) => ['store', store, 'site'] as const,
};
