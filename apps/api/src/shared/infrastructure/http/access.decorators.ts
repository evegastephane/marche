import { SetMetadata } from '@nestjs/common';
import type { MemberRole } from '../../application/actor-context.port.js';

export const IS_PUBLIC = 'marche:is-public';
export const NO_STORE_REQUIRED = 'marche:no-store-required';
export const REQUIRED_ROLES = 'marche:required-roles';

/** Route sans authentification Clerk (storefront, webhooks, santé). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route authentifiée qui ne nécessite pas encore de boutique active (ex. création de boutique). */
export const NoStoreRequired = () => SetMetadata(NO_STORE_REQUIRED, true);

/**
 * Rôles autorisés. Un OWNER a toujours tous les droits.
 * Sans ce décorateur, tout membre de la boutique a accès.
 */
export const Roles = (...roles: MemberRole[]) => SetMetadata(REQUIRED_ROLES, roles);

/** Préfixes de routes (docs/PLAN-CODE.md §8). */
export const ADMIN_API = 'api/v1';
export const STOREFRONT_API = 'storefront/v1';
