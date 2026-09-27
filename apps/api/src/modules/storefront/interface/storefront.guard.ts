import { timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { STOREFRONT_HEADERS } from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { TenantContext } from '../../../shared/infrastructure/cls/tenant-context.js';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import type { MarcheRequest } from '../../../shared/infrastructure/http/marche-request.js';
import { SitesFacade } from '../../sites/sites.facade.js';

export interface StorefrontRequestContext {
  siteId: string;
  subdomain: string;
  /** Aperçu du thème en brouillon (jeton valide), le site peut alors être hors ligne. */
  preview: boolean;
  /** Le site accepte des commandes (en ligne et hors aperçu). */
  acceptsOrders: boolean;
}

interface StorefrontRequest extends MarcheRequest {
  storefront?: StorefrontRequestContext;
}

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

function safeEqual(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function header(request: StorefrontRequest, name: string): string | undefined {
  const value = request.headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

/** Extrait le sous-domaine d'un en-tête « slug » ou « slug.domaine-racine ». */
export function subdomainFrom(host: string, rootDomain: string): string | null {
  const normalized = host.toLowerCase().replace(/:\d+$/, '');
  const root = rootDomain.toLowerCase().replace(/:\d+$/, '');
  const candidate = normalized.endsWith(`.${root}`) ? normalized.slice(0, -(root.length + 1)) : normalized;
  return SUBDOMAIN_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Accès à l'API storefront (appels serveur à serveur depuis Next.js) :
 * secret partagé → boutique résolue par le sous-domaine → aperçu éventuel → contexte tenant.
 */
@Injectable()
export class StorefrontGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly sites: SitesFacade,
    private readonly tenant: TenantContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StorefrontRequest>();
    const token = header(request, STOREFRONT_HEADERS.token);
    if (!token || !safeEqual(token, this.config.storefront.apiToken)) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Jeton storefront invalide' });
    }

    const host = header(request, STOREFRONT_HEADERS.storeHost);
    const subdomain = host ? subdomainFrom(host, this.config.storefront.rootDomain) : null;
    const site = subdomain ? await this.sites.resolveHost(subdomain) : null;
    if (!site) throw new NotFoundError('Boutique');

    const previewToken = header(request, STOREFRONT_HEADERS.previewToken);
    const claims = previewToken ? await this.sites.verifyPreviewToken(previewToken) : null;
    const preview = claims?.siteId === site.siteId;
    if (site.status !== 'PUBLISHED' && !preview) throw new NotFoundError('Boutique');

    this.tenant.setStore(site.storeId);
    request.actor = { ...request.actor, storeId: site.storeId };
    request.storefront = {
      siteId: site.siteId,
      subdomain: site.subdomain,
      preview,
      acceptsOrders: site.status === 'PUBLISHED' && !preview,
    };
    return true;
  }
}

/** Contexte storefront posé par le guard. */
export const Storefront = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StorefrontRequestContext => {
    const request = context.switchToHttp().getRequest<StorefrontRequest>();
    if (!request.storefront) throw new Error('StorefrontGuard absent');
    return request.storefront;
  },
);
