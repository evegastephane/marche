import { timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PUBLISHABLE_KEY_HEADER, STOREFRONT_HEADERS } from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { TenantContext } from '../../../shared/infrastructure/cls/tenant-context.js';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import type { MarcheRequest } from '../../../shared/infrastructure/http/marche-request.js';
import { ApiKeyAuthenticator } from '../../developers/application/api-key-authenticator.js';
import { SitesFacade } from '../../sites/sites.facade.js';

export interface StorefrontRequestContext {
  /** Site Upsell de la boutique ; null pour un front tiers (clé pk_) sans site généré. */
  siteId: string | null;
  subdomain: string | null;
  /** Aperçu du thème en brouillon (jeton valide), le site peut alors être hors ligne. */
  preview: boolean;
  /** Session d'aperçu en direct (éditeur du dashboard), quand le jeton en porte une. */
  previewSession?: string;
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
 * Accès à l'API storefront, par deux portes :
 * - sites Upsell (serveur à serveur depuis Next.js) : secret partagé → boutique résolue par le
 *   sous-domaine → aperçu éventuel → contexte tenant ;
 * - front tiers (navigateur ou serveur d'un développeur) : clé publique pk_ dans x-publishable-key
 *   → boutique de la clé ; l'origine d'un navigateur doit figurer parmi celles de la clé.
 */
@Injectable()
export class StorefrontGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly sites: SitesFacade,
    private readonly tenant: TenantContext,
    private readonly apiKeys: ApiKeyAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StorefrontRequest>();
    const publishable = header(request, PUBLISHABLE_KEY_HEADER);
    if (publishable) return this.viaPublishableKey(request, publishable);
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
      previewSession: preview ? claims?.session : undefined,
      acceptsOrders: site.status === 'PUBLISHED' && !preview,
    };
    return true;
  }

  private async viaPublishableKey(request: StorefrontRequest, token: string): Promise<boolean> {
    const key = await this.apiKeys.authenticate(token);
    if (!key || key.kind !== 'PUBLISHABLE') {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Clé publique invalide ou révoquée' });
    }
    // Un navigateur envoie toujours son origine : elle doit avoir été déclarée sur la clé.
    const origin = header(request, 'origin');
    if (origin && !key.allowedOrigins.includes(origin)) {
      throw new ForbiddenException({
        code: 'ORIGIN_NOT_ALLOWED',
        message: `Origine « ${origin} » non autorisée pour cette clé : ajoutez-la dans Développeurs`,
      });
    }
    this.tenant.setStore(key.storeId);
    request.actor = { ...request.actor, storeId: key.storeId, apiKeyId: key.id };
    const site = await this.sites.currentSite();
    request.storefront = {
      siteId: site?.siteId ?? null,
      subdomain: site?.subdomain ?? null,
      preview: false,
      // La clé est l'accord explicite du marchand pour vendre depuis ce front, site Upsell ou non.
      acceptsOrders: true,
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
