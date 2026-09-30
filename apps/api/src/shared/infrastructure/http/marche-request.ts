import type { Request } from 'express';

/** Informations posées sur la requête par les guards (reprises dans les logs). */
export interface RequestActor {
  userId?: string;
  clerkUserId?: string;
  storeId?: string;
  clerkOrgId?: string;
  clerkOrgRole?: string;
  /** Clé d'API sk_ ou pk_ utilisée (identifiant, jamais la clé). */
  apiKeyId?: string;
}

/** Clé secrète reconnue par ClerkAuthGuard : boutique et droits. */
export interface RequestApiKey {
  id: string;
  storeId: string;
  scopes: string[];
}

export interface MarcheRequest extends Request {
  actor?: RequestActor;
  apiKey?: RequestApiKey;
  rawBody?: Buffer;
}
