import { SetMetadata } from '@nestjs/common';
import type { ApiScopeResource } from '@marche/contracts';
import type { MemberRole } from '../../application/actor-context.port.js';

export const IS_PUBLIC = 'marche:is-public';
export const NO_STORE_REQUIRED = 'marche:no-store-required';
export const REQUIRED_ROLES = 'marche:required-roles';
export const API_SCOPE = 'marche:api-scope';

/** Route sans authentification Clerk (storefront, webhooks, santé). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route authentifiée qui ne nécessite pas encore de boutique active (ex. création de boutique). */
export const NoStoreRequired = () => SetMetadata(NO_STORE_REQUIRED, true);

/**
 * Rôles autorisés. Un OWNER a toujours tous les droits.
 * Sans ce décorateur, tout membre de la boutique a accès.
 */
export const Roles = (...roles: MemberRole[]) => SetMetadata(REQUIRED_ROLES, roles);

/**
 * Ouvre les routes aux clés secrètes sk_ : lecture (GET) avec « ressource:read », le reste avec
 * « ressource:write ». Une route sans ce décorateur est refusée à toute clé d'API (refus par défaut).
 */
export const ApiScope = (resource: ApiScopeResource) => SetMetadata(API_SCOPE, resource);

/** Préfixes de routes (docs/PLAN-CODE.md §8). */
export const ADMIN_API = 'api/v1';
export const STOREFRONT_API = 'storefront/v1';
