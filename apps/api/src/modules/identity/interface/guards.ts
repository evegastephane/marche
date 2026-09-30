import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type ApiScopeResource, requiredScope, scopeGranted } from '@marche/contracts';
import type { MemberRole } from '../../../shared/application/actor-context.port.js';
import { ClerkNotConfiguredError } from '../../../shared/infrastructure/clerk/clerk.module.js';
import { TenantContext } from '../../../shared/infrastructure/cls/tenant-context.js';
import {
  API_SCOPE,
  IS_PUBLIC,
  NO_STORE_REQUIRED,
  REQUIRED_ROLES,
} from '../../../shared/infrastructure/http/access.decorators.js';
import type { MarcheRequest } from '../../../shared/infrastructure/http/marche-request.js';
import { ApiKeyAuthenticator } from '../../developers/application/api-key-authenticator.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { AccessTokenVerifier } from '../application/identity.ports.js';
import { LocalUserService } from '../application/local-user.service.js';
import { roleFromClerk } from '../domain/user.repository.js';

function isHttp(context: ExecutionContext): boolean {
  return context.getType() === 'http';
}

function bearerToken(request: MarcheRequest): string | undefined {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * 1) Authentification : jeton Clerk valide → utilisateur local dans le contexte ; ou clé secrète sk_
 * (serveur d'un développeur) → boutique et droits de la clé, sans utilisateur.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: AccessTokenVerifier,
    private readonly users: LocalUserService,
    private readonly tenant: TenantContext,
    private readonly apiKeys: ApiKeyAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isHttp(context)) return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<MarcheRequest>();
    const token = bearerToken(request);
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Jeton d’accès manquant' });
    }
    if (token.startsWith('sk_') || token.startsWith('pk_')) return this.viaApiKey(request, token);

    let claims;
    try {
      claims = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof ClerkNotConfiguredError) throw error;
      this.logger.debug(`Jeton refusé : ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Jeton d’accès invalide ou expiré' });
    }

    const userId = await this.users.resolve(claims.sub);
    this.tenant.setUser(userId, claims.sub);
    request.actor = {
      userId,
      clerkUserId: claims.sub,
      clerkOrgId: claims.orgId,
      clerkOrgRole: claims.orgRole,
    };
    return true;
  }

  private async viaApiKey(request: MarcheRequest, token: string): Promise<boolean> {
    if (token.startsWith('pk_')) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Clé publique pk_ : elle ouvre seulement /storefront/v1 (en-tête x-publishable-key). Utilisez une clé secrète sk_',
      });
    }
    const key = await this.apiKeys.authenticate(token);
    if (!key || key.kind !== 'SECRET') {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Clé d’API invalide ou révoquée' });
    }
    request.apiKey = { id: key.id, storeId: key.storeId, scopes: key.scopes };
    request.actor = { storeId: key.storeId, apiKeyId: key.id };
    return true;
  }
}

/** 2) Boutique active : organisation Clerk du jeton → boutique, adhésion vérifiée. */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly stores: StoresFacade,
    private readonly tenant: TenantContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isHttp(context)) return true;
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ||
      this.reflector.getAllAndOverride<boolean>(NO_STORE_REQUIRED, targets)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<MarcheRequest>();
    if (request.apiKey) {
      // La boutique est celle de la clé (vérifiée active à l'authentification).
      this.tenant.setStore(request.apiKey.storeId);
      return true;
    }
    const actor = request.actor;
    if (!actor?.userId) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Authentification requise' });
    }
    const storeRequired = new ForbiddenException({
      code: 'STORE_REQUIRED',
      message: 'Aucune boutique active : sélectionnez ou créez une boutique',
    });
    if (!actor.clerkOrgId) throw storeRequired;

    const store = await this.stores.resolveByClerkOrg(actor.clerkOrgId);
    if (!store || store.archived) throw storeRequired;

    const role = await this.stores.ensureMembership(
      store.storeId,
      actor.userId,
      roleFromClerk(actor.clerkOrgRole),
    );
    this.tenant.setStore(store.storeId, role);
    actor.storeId = store.storeId;
    return true;
  }
}

/** 3) Rôles : @Roles('ADMIN') ; un OWNER a tous les droits. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenant: TenantContext,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isHttp(context)) return true;
    const required = this.reflector.getAllAndOverride<MemberRole[] | undefined>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    // Une clé d'API n'a pas de rôle : ApiScopeGuard décide avec ses droits.
    if (context.switchToHttp().getRequest<MarcheRequest>().apiKey) return true;
    const role = this.tenant.role;
    if (role === 'OWNER' || (role && required.includes(role))) return true;
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Action réservée aux administrateurs de la boutique',
    });
  }
}

/**
 * 4) Droits d'une clé secrète : la route doit porter @ApiScope (refus par défaut), et la clé le droit
 * « ressource:read » (GET) ou « ressource:write » (le reste). Sans clé d'API, rien à vérifier.
 */
@Injectable()
export class ApiScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isHttp(context)) return true;
    const request = context.switchToHttp().getRequest<MarcheRequest>();
    const key = request.apiKey;
    if (!key) return true;
    const resource = this.reflector.getAllAndOverride<ApiScopeResource | undefined>(API_SCOPE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!resource) {
      throw new ForbiddenException({
        code: 'API_KEY_FORBIDDEN',
        message: 'Cette route n’est pas ouverte aux clés d’API (boutique, site, campagnes et clés restent au dashboard)',
      });
    }
    const required = requiredScope(resource, request.method);
    if (!scopeGranted(key.scopes, required)) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_SCOPE',
        message: `Cette clé n’a pas le droit « ${required} »`,
        details: { required },
      });
    }
    return true;
  }
}
