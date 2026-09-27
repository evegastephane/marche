import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '../../../shared/application/actor-context.port.js';
import { ClerkNotConfiguredError } from '../../../shared/infrastructure/clerk/clerk.module.js';
import { TenantContext } from '../../../shared/infrastructure/cls/tenant-context.js';
import {
  IS_PUBLIC,
  NO_STORE_REQUIRED,
  REQUIRED_ROLES,
} from '../../../shared/infrastructure/http/access.decorators.js';
import type { MarcheRequest } from '../../../shared/infrastructure/http/marche-request.js';
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

/** 1) Authentification : jeton Clerk valide → utilisateur local dans le contexte. */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: AccessTokenVerifier,
    private readonly users: LocalUserService,
    private readonly tenant: TenantContext,
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
    const role = this.tenant.role;
    if (role === 'OWNER' || (role && required.includes(role))) return true;
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Action réservée aux administrateurs de la boutique',
    });
  }
}
