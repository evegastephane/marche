import type { ApiKeyDto, ApiKeyKind, ApiScope } from '@marche/contracts';

export interface NewApiKey {
  id: string;
  storeId: string;
  name: string;
  kind: ApiKeyKind;
  tokenHash: string;
  token: string | null;
  prefix: string;
  last4: string;
  scopes: ApiScope[];
  allowedOrigins: string[];
  createdById: string | null;
}

/** Clé reconnue dans une requête : de quoi poser la boutique et vérifier droits et origine. */
export interface AuthenticatedApiKey {
  id: string;
  storeId: string;
  kind: ApiKeyKind;
  scopes: string[];
  allowedOrigins: string[];
}

export abstract class ApiKeyRepository {
  /** Clés de la boutique courante, actives d'abord puis révoquées, les plus récentes en tête. */
  abstract list(): Promise<ApiKeyDto[]>;
  abstract get(id: string): Promise<ApiKeyDto | null>;
  abstract insert(key: NewApiKey): Promise<void>;
  abstract update(id: string, patch: { name?: string; scopes?: ApiScope[]; allowedOrigins?: string[] }): Promise<boolean>;
  abstract revoke(id: string, at: Date): Promise<boolean>;
  abstract countActive(): Promise<number>;

  /** Lecture système (aucune boutique connue) : clé active par son empreinte. */
  abstract findActiveByHash(tokenHash: string): Promise<AuthenticatedApiKey | null>;
  /** Marque l'usage, au plus une écriture par minute et par clé. */
  abstract touch(id: string, at: Date): Promise<void>;
  /** Origines déclarées par les clés publiques actives de toutes les boutiques (CORS). */
  abstract activeOrigins(): Promise<string[]>;
}
