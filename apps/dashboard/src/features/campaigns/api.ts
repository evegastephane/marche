import type { CampaignDto, LaunchCampaignInput, WhatsAppAudienceDto } from '@marche/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';

/** Campagnes récentes ; tant qu'une campagne part, la liste se rafraîchit toute seule. */
export function useCampaigns() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: [...qk.campaigns(store), 'list'],
    queryFn: ({ signal }) => api<CampaignDto[]>('GET', '/api/v1/campaigns', { signal }),
    refetchInterval: (query) => (query.state.data?.some((c) => c.status === 'SENDING') ? 3_000 : false),
  });
}

export function useAudience() {
  const api = useApi();
  const store = useStoreKey();
  return useQuery({
    queryKey: [...qk.campaigns(store), 'audience'],
    queryFn: ({ signal }) => api<WhatsAppAudienceDto>('GET', '/api/v1/campaigns/audience', { signal }),
  });
}

export function useLaunchCampaign() {
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LaunchCampaignInput) => api<CampaignDto>('POST', '/api/v1/campaigns', { body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.campaigns(store) }),
  });
}

/**
 * Texte du modèle recommandé (à créer chez Meta, catégorie Marketing, langue français),
 * dans l'ordre des paramètres envoyés par l'API : prénom, boutique, produit, prix, lien.
 */
export function messagePreview(params: { firstName: string; store: string; product: string; price: string; url: string }) {
  return `Bonjour ${params.firstName} ! Nouveau chez ${params.store} : ${params.product}, à ${params.price}. Découvrez-le ici : ${params.url}`;
}
