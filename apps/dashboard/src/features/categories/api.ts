import type {
  AttributeDto,
  AttributeValueInput,
  CategoryDetailDto,
  CategoryDto,
  CreateAttributeInput,
  CreateCategoryInput,
  SetCategoryAttributesInput,
  TemplateInstallDto,
  UpdateAttributeInput,
  UpdateAttributeValueInput,
  UpdateCategoryInput,
} from '@marche/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

/** Arbre des catégories, à plat (parentId), dans l'ordre. */
export function useCategories(includeArchived = false) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.categories(store, includeArchived),
    queryFn: ({ signal }) =>
      api<CategoryDto[]>('GET', '/api/v1/categories', { signal, query: { includeArchived: includeArchived || undefined } }),
    staleTime: 60_000,
  });
}

/** Requête d'une catégorie, partagée par `useCategory` et les lectures impératives (`fetchQuery`). */
export function categoryQuery(api: ReturnType<typeof useApi>, store: string, id: string) {
  return {
    queryKey: qk.category(store, id),
    queryFn: ({ signal }: { signal?: AbortSignal }) => api<CategoryDetailDto>('GET', `/api/v1/categories/${id}`, { signal }),
    staleTime: 60_000,
  };
}

/** Catégorie avec son chemin et ses attributs effectifs (hérités compris). */
export function useCategory(id: string | null | undefined) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({ ...categoryQuery(api, store, id ?? ''), enabled: Boolean(id) });
}

export function useAttributes(includeArchived = false) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: qk.attributes(store, includeArchived),
    queryFn: ({ signal }) =>
      api<AttributeDto[]>('GET', '/api/v1/attributes', { signal, query: { includeArchived: includeArchived || undefined } }),
    staleTime: 60_000,
  });
}

/** Toute écriture sur la taxonomie rafraîchit catégories, attributs et fiches ouvertes. */
function useTaxonomyMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.taxonomy(store) }),
  });
}

export function useCreateCategory() {
  const api = useApi();
  return useTaxonomyMutation((input: CreateCategoryInput) =>
    api<CategoryDetailDto>('POST', '/api/v1/categories', { body: input }),
  );
}

export function useUpdateCategory() {
  const api = useApi();
  return useTaxonomyMutation(({ id, input }: { id: string; input: UpdateCategoryInput }) =>
    api<CategoryDetailDto>('PATCH', `/api/v1/categories/${id}`, { body: input }),
  );
}

export function useSetCategoryAttributes() {
  const api = useApi();
  return useTaxonomyMutation(({ id, input }: { id: string; input: SetCategoryAttributesInput }) =>
    api<CategoryDetailDto>('PUT', `/api/v1/categories/${id}/attributes`, { body: input }),
  );
}

export function useCategoryArchive() {
  const api = useApi();
  return useTaxonomyMutation(({ id, archived }: { id: string; archived: boolean }) =>
    api<CategoryDetailDto>('POST', `/api/v1/categories/${id}/${archived ? 'archive' : 'restore'}`),
  );
}

export function useInstallTemplate() {
  const api = useApi();
  return useTaxonomyMutation(() => api<TemplateInstallDto>('POST', '/api/v1/categories/template'));
}

export function useCreateAttribute() {
  const api = useApi();
  return useTaxonomyMutation((input: CreateAttributeInput) =>
    api<AttributeDto>('POST', '/api/v1/attributes', { body: input }),
  );
}

export function useUpdateAttribute() {
  const api = useApi();
  return useTaxonomyMutation(({ id, input }: { id: string; input: UpdateAttributeInput }) =>
    api<AttributeDto>('PATCH', `/api/v1/attributes/${id}`, { body: input }),
  );
}

export function useAttributeArchive() {
  const api = useApi();
  return useTaxonomyMutation(({ id, archived }: { id: string; archived: boolean }) =>
    api<AttributeDto>('POST', `/api/v1/attributes/${id}/${archived ? 'archive' : 'restore'}`),
  );
}

export function useAddAttributeValues() {
  const api = useApi();
  return useTaxonomyMutation(async ({ id, values }: { id: string; values: AttributeValueInput[] }) => {
    let attribute: AttributeDto | null = null;
    for (const value of values) attribute = await api<AttributeDto>('POST', `/api/v1/attributes/${id}/values`, { body: value });
    return attribute;
  });
}

export function useUpdateAttributeValue() {
  const api = useApi();
  return useTaxonomyMutation(({ id, valueId, input }: { id: string; valueId: string; input: UpdateAttributeValueInput }) =>
    api<AttributeDto>('PATCH', `/api/v1/attributes/${id}/values/${valueId}`, { body: input }),
  );
}

export function useDeleteAttributeValue() {
  const api = useApi();
  return useTaxonomyMutation(({ id, valueId }: { id: string; valueId: string }) =>
    api<AttributeDto>('DELETE', `/api/v1/attributes/${id}/values/${valueId}`),
  );
}

export function useReorderAttributeValues() {
  const api = useApi();
  return useTaxonomyMutation(({ id, valueIds }: { id: string; valueIds: string[] }) =>
    api<AttributeDto>('PUT', `/api/v1/attributes/${id}/values/order`, { body: { valueIds } }),
  );
}

/** Catégories rangées en arbre (parent puis enfants), avec leur profondeur. */
export function flattenTree<T extends { id: string; parentId: string | null; position: number; name: string }>(
  categories: readonly T[],
): { category: T; depth: number }[] {
  const children = new Map<string | null, T[]>();
  for (const category of categories) {
    const siblings = children.get(category.parentId) ?? [];
    siblings.push(category);
    children.set(category.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));
  }
  const known = new Set(categories.map((category) => category.id));
  const roots = categories.filter((category) => !category.parentId || !known.has(category.parentId));
  const out: { category: T; depth: number }[] = [];
  const visit = (category: T, depth: number) => {
    out.push({ category, depth });
    for (const child of children.get(category.id) ?? []) visit(child, depth + 1);
  };
  for (const root of roots.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'))) visit(root, 0);
  return out;
}
