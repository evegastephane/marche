import type { MediaDto, StoreDto, UpdateStoreInput } from '@marche/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

export function useUpdateStore() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStoreInput) => api<StoreDto>('PATCH', '/api/v1/stores/current', { body: input }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(qk.store(store), updated);
      await queryClient.invalidateQueries({ queryKey: qk.site(store) });
    },
  });
}

/** Image déjà téléversée (logo de la boutique) : lue par son identifiant. */
export function useMediaById(id: string | null) {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: ['store', store, 'media', id],
    enabled: id !== null,
    queryFn: ({ signal }) => api<MediaDto>('GET', `/api/v1/media/${id}`, { signal }),
    staleTime: Infinity,
  });
}
