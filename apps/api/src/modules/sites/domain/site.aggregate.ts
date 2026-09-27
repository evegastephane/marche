import type { SiteStatus, ThemeSettings } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ConflictError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export interface SiteData {
  storeId: string;
  subdomain: string;
  templateId: string;
  templateVersion: string;
  /** Thème en ligne. */
  themeSettings: ThemeSettings;
  /** Thème en cours d'édition (aperçu), publié par publishTheme(). */
  draftThemeSettings: ThemeSettings;
  status: SiteStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const clone = (settings: ThemeSettings): ThemeSettings => structuredClone(settings);

/** Site généré d'une boutique (un par boutique), servi par le storefront multi-tenant. */
export class Site extends AggregateRoot {
  private constructor(
    id: string,
    private data: SiteData,
    version = 0,
  ) {
    super(id, version);
  }

  /** UC-40 : le site naît publié ; le thème en ligne et le brouillon partent du même preset. */
  static generate(
    input: { storeId: string; subdomain: string; templateId: string; templateVersion: string; settings: ThemeSettings },
    now: Date,
  ): Site {
    const site = new Site(newId(), {
      storeId: input.storeId,
      subdomain: input.subdomain,
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      themeSettings: clone(input.settings),
      draftThemeSettings: clone(input.settings),
      status: 'PUBLISHED',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    site.record(
      createEvent(
        'sites.site.published',
        input.storeId,
        site.id,
        { subdomain: input.subdomain, templateId: input.templateId, firstPublication: true },
        now,
      ),
    );
    return site;
  }

  static reconstitute(id: string, data: SiteData, version: number): Site {
    return new Site(id, { ...data, themeSettings: clone(data.themeSettings), draftThemeSettings: clone(data.draftThemeSettings) }, version);
  }

  get storeId(): string {
    return this.data.storeId;
  }

  get subdomain(): string {
    return this.data.subdomain;
  }

  get status(): SiteStatus {
    return this.data.status;
  }

  get templateId(): string {
    return this.data.templateId;
  }

  get hasUnpublishedChanges(): boolean {
    return JSON.stringify(this.data.themeSettings) !== JSON.stringify(this.data.draftThemeSettings);
  }

  snapshot(): Readonly<SiteData> {
    return {
      ...this.data,
      themeSettings: clone(this.data.themeSettings),
      draftThemeSettings: clone(this.data.draftThemeSettings),
    };
  }

  /** UC-41 : les réglages sont validés en amont par le schéma du template. */
  updateDraftTheme(settings: ThemeSettings, now: Date): void {
    this.data = { ...this.data, draftThemeSettings: clone(settings), updatedAt: now };
  }

  /** Le brouillon devient le thème en ligne. */
  publishTheme(now: Date): void {
    if (!this.hasUnpublishedChanges) return;
    this.data = { ...this.data, themeSettings: clone(this.data.draftThemeSettings), updatedAt: now };
    this.record(createEvent('sites.theme.published', this.data.storeId, this.id, { subdomain: this.data.subdomain }, now));
  }

  /** UC-42 */
  publish(now: Date): void {
    if (this.data.status === 'PUBLISHED') return;
    this.data = { ...this.data, status: 'PUBLISHED', publishedAt: now, updatedAt: now };
    this.record(
      createEvent('sites.site.published', this.data.storeId, this.id, { subdomain: this.data.subdomain, firstPublication: false }, now),
    );
  }

  unpublish(now: Date): void {
    if (this.data.status !== 'PUBLISHED') {
      throw new ConflictError('CONFLICT', 'Le site n’est pas en ligne');
    }
    this.data = { ...this.data, status: 'UNPUBLISHED', updatedAt: now };
    this.record(createEvent('sites.site.unpublished', this.data.storeId, this.id, { subdomain: this.data.subdomain }, now));
  }
}
