import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { type SiteStatus, themeSettingsBaseSchema, type ThemeSettings } from '@marche/contracts';
import { jwtVerify, SignJWT } from 'jose';
import type { Prisma, Site as SiteRow } from '../../../generated/prisma/client.js';
import { ConcurrentModificationError } from '../../../shared/domain/domain-error.js';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import {
  type PreviewClaims,
  PreviewTokens,
  SiteRepository,
  StorefrontRevalidator,
} from '../application/sites.ports.js';
import { Site } from '../domain/site.aggregate.js';

function parseTheme(value: Prisma.JsonValue): ThemeSettings {
  return themeSettingsBaseSchema.parse(value);
}

function toDomain(row: SiteRow): Site {
  return Site.reconstitute(
    row.id,
    {
      storeId: row.storeId,
      subdomain: row.subdomain,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      themeSettings: parseTheme(row.themeSettings),
      draftThemeSettings: parseTheme(row.draftThemeSettings),
      status: row.status as SiteStatus,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    row.version,
  );
}

@Injectable()
export class PrismaSiteRepository extends SiteRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findCurrent(): Promise<Site | null> {
    // Modèle « tenant » : le filtre sur la boutique courante est ajouté automatiquement.
    const row = await this.txHost.tx.site.findFirst();
    return row ? toDomain(row) : null;
  }

  async findBySubdomain(subdomain: string): Promise<Site | null> {
    const row = await this.txHost.tx.site.findUnique({ where: { subdomain } });
    return row ? toDomain(row) : null;
  }

  async insert(site: Site): Promise<void> {
    const s = site.snapshot();
    await this.txHost.tx.site.create({
      data: {
        id: site.id,
        storeId: s.storeId,
        subdomain: s.subdomain,
        templateId: s.templateId,
        templateVersion: s.templateVersion,
        themeSettings: s.themeSettings as unknown as Prisma.InputJsonValue,
        draftThemeSettings: s.draftThemeSettings as unknown as Prisma.InputJsonValue,
        status: s.status,
        publishedAt: s.publishedAt,
        createdAt: s.createdAt,
      },
    });
  }

  async update(site: Site): Promise<void> {
    const s = site.snapshot();
    const { count } = await this.txHost.tx.site.updateMany({
      where: { id: site.id, version: site.version },
      data: {
        themeSettings: s.themeSettings as unknown as Prisma.InputJsonValue,
        draftThemeSettings: s.draftThemeSettings as unknown as Prisma.InputJsonValue,
        status: s.status,
        publishedAt: s.publishedAt,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConcurrentModificationError('Le site');
    site.markPersisted();
  }
}

const PREVIEW_TTL_SECONDS = 30 * 60;
const PREVIEW_AUDIENCE = 'marche:preview';

@Injectable()
export class JosePreviewTokens extends PreviewTokens {
  private readonly key: Uint8Array;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    this.key = new TextEncoder().encode(config.storefront.previewTokenSecret);
  }

  async sign(claims: PreviewClaims): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000);
    const token = await new SignJWT({ storeId: claims.storeId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.siteId)
      .setAudience(PREVIEW_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    return { token, expiresAt };
  }

  async verify(token: string): Promise<PreviewClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { audience: PREVIEW_AUDIENCE, algorithms: ['HS256'] });
      return typeof payload.sub === 'string' && typeof payload.storeId === 'string'
        ? { siteId: payload.sub, storeId: payload.storeId }
        : null;
    } catch {
      return null;
    }
  }
}

/** Appelle la route /api/revalidate du storefront (secret partagé, délai de 5 s). */
@Injectable()
export class HttpStorefrontRevalidator extends StorefrontRevalidator {
  private readonly logger = new Logger(HttpStorefrontRevalidator.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  async revalidate(tags: readonly string[], options: { immediate: boolean }): Promise<void> {
    const response = await fetch(`${this.config.storefront.internalUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': this.config.storefront.revalidateSecret,
      },
      body: JSON.stringify({ tags, immediate: options.immediate }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Revalidation refusée par le storefront : HTTP ${response.status}`);
    }
    this.logger.debug(`Revalidé : ${tags.join(', ')}`);
  }
}
