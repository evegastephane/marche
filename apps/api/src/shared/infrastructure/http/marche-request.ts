import type { Request } from 'express';

/** Informations posées sur la requête par les guards (reprises dans les logs). */
export interface RequestActor {
  userId?: string;
  clerkUserId?: string;
  storeId?: string;
  clerkOrgId?: string;
  clerkOrgRole?: string;
}

export interface MarcheRequest extends Request {
  actor?: RequestActor;
  rawBody?: Buffer;
}
