import { useAuth } from '@clerk/react';
import { useMemo } from 'react';
import { type ApiRequest, createApiClient } from './client';

/**
 * Client API authentifié. Le jeton Clerk porte l'organisation active :
 * l'API en déduit la boutique. Les sessions « en attente » (aucune boutique choisie)
 * restent utilisables pour créer la première boutique.
 */
export function useApi(): ApiRequest {
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  return useMemo(() => createApiClient(() => getToken()), [getToken]);
}

/** Organisation active = boutique courante ; sert de préfixe aux clés de cache. */
export function useStoreKey(): string {
  const { orgId } = useAuth({ treatPendingAsSignedOut: false });
  return orgId ?? 'aucune';
}
