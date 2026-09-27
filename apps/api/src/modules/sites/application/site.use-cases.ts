import { Injectable } from '@nestjs/common';
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type PreviewTokenDto,
  type SiteDto,
  type TemplateDefinition,
  type ThemeSettings,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { PublicUrls } from '../../../shared/application/public-urls.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { Site } from '../domain/site.aggregate.js';
import { PreviewTokens, SiteHostCache, SiteRepository } from './sites.ports.js';

function requireTemplate(templateId: string): TemplateDefinition {
  const template = getTemplate(templateId);
  if (!template) throw new ValidationError('VALIDATION_FAILED', `Template inconnu : ${templateId}`);
  return template;
}

/** Valide des réglages de thème avec le schéma du template (422 détaillé sinon). */
export function parseThemeSettings(template: TemplateDefinition, settings: unknown): ThemeSettings {
  const result = template.settingsSchema.safeParse(settings);
  if (!result.success) {
    throw new ValidationError('VALIDATION_FAILED', 'Réglages de thème invalides', {
      errors: result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
    });
  }
  return result.data;
}

/**
 * Préremplissage du preset (pattern Prototype : on part d'une copie du preset du template)
 * avec l'identité de la boutique et son premier catalogue publié.
 */
export function prefillSettings(
  preset: ThemeSettings,
  store: { name: string; logoMediaId: string | null },
  featured: { id: string; title: string } | null,
): ThemeSettings {
  const settings = structuredClone(preset);
  settings.logoMediaId = store.logoMediaId;
  settings.sections = settings.sections.map((section) => {
    if (section.type === 'hero') return { ...section, title: `Bienvenue chez ${store.name}`.slice(0, 120) };
    if (section.type === 'featured-collection') {
      return featured
        ? { ...section, collectionId: featured.id, title: featured.title.slice(0, 120) }
        : { ...section, enabled: false };
    }
    return section;
  });
  return settings;
}

@Injectable()
export class SiteDtoMapper {
  constructor(private readonly urls: PublicUrls) {}

  toDto(site: Site): SiteDto {
    const s = site.snapshot();
    return {
      id: site.id,
      subdomain: s.subdomain,
      url: this.urls.site(s.subdomain),
      templateId: s.templateId,
      templateVersion: s.templateVersion,
      status: s.status,
      themeSettings: s.themeSettings,
      draftThemeSettings: s.draftThemeSettings,
      hasUnpublishedChanges: site.hasUnpublishedChanges,
      publishedAt: s.publishedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}

/** UC-40 : « Générer mon site ». Idempotent : si le site existe, il est renvoyé tel quel. */
@Injectable()
export class GenerateSiteUseCase {
  constructor(
    private readonly sites: SiteRepository,
    private readonly stores: StoresFacade,
    private readonly catalog: CatalogFacade,
    private readonly hostCache: SiteHostCache,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
    private readonly mapper: SiteDtoMapper,
  ) {}

  async execute(templateId: string = DEFAULT_TEMPLATE_ID): Promise<SiteDto> {
    const existing = await this.sites.findCurrent();
    if (existing) return this.mapper.toDto(existing);

    const template = requireTemplate(templateId);
    const store = await this.stores.getSettings(this.actor.storeId);
    const [firstCollection] = await this.catalog.listPublishedCollections();
    const settings = parseThemeSettings(
      template,
      prefillSettings(
        template.defaultSettings,
        { name: store.name, logoMediaId: store.logoMediaId },
        firstCollection ? { id: firstCollection.id, title: firstCollection.title } : null,
      ),
    );
    const site = Site.generate(
      {
        storeId: store.id,
        subdomain: store.slug,
        templateId: template.manifest.id,
        templateVersion: template.manifest.version,
        settings,
      },
      this.clock.now(),
    );
    await this.uow.run(async () => {
      await this.sites.insert(site);
      await this.outbox.addAll(site.pullEvents());
    });
    await this.hostCache.invalidate(site.subdomain);
    return this.mapper.toDto(site);
  }
}

/** UC-41, UC-42 : thème (brouillon, publication), mise en ligne et hors ligne, lecture. */
@Injectable()
export class SiteUseCases {
  constructor(
    private readonly sites: SiteRepository,
    private readonly hostCache: SiteHostCache,
    private readonly previews: PreviewTokens,
    private readonly urls: PublicUrls,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
    private readonly mapper: SiteDtoMapper,
  ) {}

  async get(): Promise<SiteDto> {
    return this.mapper.toDto(await this.current());
  }

  updateDraftTheme(settings: unknown): Promise<SiteDto> {
    return this.mutate((site) => {
      site.updateDraftTheme(parseThemeSettings(requireTemplate(site.templateId), settings), this.clock.now());
    });
  }

  publishTheme(): Promise<SiteDto> {
    return this.mutate((site) => site.publishTheme(this.clock.now()));
  }

  publish(): Promise<SiteDto> {
    return this.mutate((site) => site.publish(this.clock.now()), true);
  }

  unpublish(): Promise<SiteDto> {
    return this.mutate((site) => site.unpublish(this.clock.now()), true);
  }

  /** Jeton d'aperçu (30 min) pour afficher le brouillon dans l'éditeur du dashboard. */
  async createPreviewToken(): Promise<PreviewTokenDto> {
    const site = await this.current();
    const { token, expiresAt } = await this.previews.sign({ siteId: site.id, storeId: site.storeId });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      previewUrl: `${this.urls.site(site.subdomain)}/preview?token=${encodeURIComponent(token)}`,
    };
  }

  private async current(): Promise<Site> {
    const site = await this.sites.findCurrent();
    if (!site) throw new NotFoundError('Site');
    return site;
  }

  private async mutate(change: (site: Site) => void, statusChange = false): Promise<SiteDto> {
    const site = await this.uow.run(async () => {
      const current = await this.current();
      change(current);
      await this.sites.update(current);
      await this.outbox.addAll(current.pullEvents());
      return current;
    });
    if (statusChange) await this.hostCache.invalidate(site.subdomain);
    return this.mapper.toDto(site);
  }
}
