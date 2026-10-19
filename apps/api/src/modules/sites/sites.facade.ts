import { Injectable } from '@nestjs/common';
import {
  canUseTemplate,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type SiteStatus,
  type StorePlan,
  type ThemeSettings,
} from '@marche/contracts';
import { JsonCache } from '../../shared/infrastructure/cache/json-cache.js';
import { TenantContext } from '../../shared/infrastructure/cls/tenant-context.js';
import { type PreviewClaims, PreviewThemeStore, PreviewTokens, SiteRepository } from './application/sites.ports.js';
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
    private readonly previewThemes: PreviewThemeStore,
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

  /** Site de la boutique courante (appels d'un front tiers avec une clé pk_), s'il existe. */
  async currentSite(): Promise<ResolvedSite | null> {
    const site = await this.sites.findCurrent();
    if (!site) return null;
    const s = site.snapshot();
    return { siteId: site.id, storeId: s.storeId, subdomain: s.subdomain, status: s.status };
  }

  /**
   * Thème à afficher pour la boutique courante : en aperçu, les réglages en cours d'édition de la session
   * (aperçu en direct) ou à défaut le brouillon ; sinon le thème en ligne.
   * Un modèle Premium d'une boutique en formule Gratuite s'affiche en modèle natif, sections comprises,
   * sauf dans l'aperçu en direct, où le marchand essaie les modèles avant de passer à Premium.
   */
  async currentTheme(
    preview: boolean,
    session: string | undefined,
    plan: StorePlan,
  ): Promise<{ templateId: string; templateVersion: string; theme: ThemeSettings } | null> {
    const site = await this.sites.findCurrent();
    if (!site) return null;
    const s = site.snapshot();
    const live = preview && session ? await this.previewThemes.find(site.id, session) : null;
    const chosen = live ?? (preview ? s.draftThemeSettings : s.themeSettings);
    const template = getTemplate(chosen.template);
    const theme =
      live || !template || canUseTemplate(plan, template.manifest)
        ? chosen
        : { ...chosen, template: DEFAULT_TEMPLATE_ID, palette: '' };
    // En aperçu, le brouillon peut déjà porter un autre template.
    return {
      templateId: theme.template,
      templateVersion: getTemplate(theme.template)?.manifest.version ?? s.templateVersion,
      theme,
    };
  }

  verifyPreviewToken(token: string): Promise<PreviewClaims | null> {
    return this.previews.verify(token);
  }
}
