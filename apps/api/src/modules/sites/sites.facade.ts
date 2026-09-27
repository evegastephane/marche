import { Injectable } from '@nestjs/common';
import type { SiteStatus, ThemeSettings } from '@marche/contracts';
import { JsonCache } from '../../shared/infrastructure/cache/json-cache.js';
import { TenantContext } from '../../shared/infrastructure/cls/tenant-context.js';
import { type PreviewClaims, PreviewTokens, SiteRepository } from './application/sites.ports.js';
import { hostCacheKey } from './infrastructure/site-host.cache.js';

export interface ResolvedSite {
  siteId: string;
  storeId: string;
  subdomain: string;
  status: SiteStatus;
}

/** API publique du module sites (storefront). */
@Injectable()
export class SitesFacade {
  constructor(
    private readonly sites: SiteRepository,
    private readonly previews: PreviewTokens,
    private readonly cache: JsonCache,
    private readonly tenant: TenantContext,
  ) {}

  /** Sous-domaine → site (cache 60 s). Lecture système : aucune boutique n'est encore connue. */
  async resolveHost(subdomain: string): Promise<ResolvedSite | null> {
    const key = hostCacheKey(subdomain);
    const cached = await this.cache.get<ResolvedSite | null>(key);
    if (cached !== undefined) return cached;
    const site = await this.tenant.runAsSystem(() => this.sites.findBySubdomain(subdomain));
    const resolved: ResolvedSite | null = site
      ? { siteId: site.id, storeId: site.storeId, subdomain: site.subdomain, status: site.status }
      : null;
    await this.cache.set(key, resolved, resolved ? 60 : 15);
    return resolved;
  }

  /** Thème à afficher pour la boutique courante : brouillon en aperçu, sinon thème en ligne. */
  async currentTheme(preview: boolean): Promise<{ templateId: string; templateVersion: string; theme: ThemeSettings } | null> {
    const site = await this.sites.findCurrent();
    if (!site) return null;
    const s = site.snapshot();
    return {
      templateId: s.templateId,
      templateVersion: s.templateVersion,
      theme: preview ? s.draftThemeSettings : s.themeSettings,
    };
  }

  verifyPreviewToken(token: string): Promise<PreviewClaims | null> {
    return this.previews.verify(token);
  }
}
