import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ProductAttributes, ProductKind } from '@marche/contracts';
import type { DeviceModel, Prisma } from '../../../generated/prisma/client.js';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import { type AppPrismaClient, PRISMA } from '../../../shared/infrastructure/prisma/prisma.client.js';
import { DeviceCatalog, type DeviceRecord, DeviceSpecsProvider, type ProviderHit } from '../application/devices.ports.js';
import { type MobileApiDevice, type MobileApiHit, normalizeDevice, normalizeHit } from './mobileapi.mapper.js';

const TIMEOUT_MS = 8000;

/** 503 avec un code que le dashboard traduit (le détail des erreurs 5xx n'est pas exposé). */
const unavailable = (code: string, message: string) => new ServiceUnavailableException({ code, message });

/** MobileAPI.dev : autocomplétion (1 crédit) et fiche complète (1 crédit). */
@Injectable()
export class MobileApiProvider extends DeviceSpecsProvider {
  readonly name = 'mobileapi';
  private readonly logger = new Logger(MobileApiProvider.name);
  private readonly key: string | undefined;
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    this.key = config.devices.mobileApiKey;
    this.baseUrl = config.devices.mobileApiUrl;
  }

  get enabled(): boolean {
    return Boolean(this.key);
  }

  async search(query: string, limit: number): Promise<ProviderHit[]> {
    const hits = await this.get<MobileApiHit[] | { results?: MobileApiHit[] }>(
      `/devices/autocomplete/?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    const list = Array.isArray(hits) ? hits : (hits.results ?? []);
    return list.map(normalizeHit).filter((hit) => hit.name);
  }

  async fetch(providerId: string): Promise<{ device: Omit<DeviceRecord, 'id' | 'provider'>; raw: unknown }> {
    const raw = await this.get<MobileApiDevice & { image_b64?: unknown }>(`/devices/${encodeURIComponent(providerId)}/`);
    // L'image encodée n'est pas gardée : elle alourdit la fiche et ses droits d'usage dépendent de l'offre.
    const { image_b64: _image, ...kept } = raw;
    return { device: normalizeDevice(kept), raw: kept };
  }

  private async get<T>(path: string): Promise<T> {
    if (!this.key) throw unavailable('DEVICE_SERVICE_DISABLED', 'Recherche en ligne des appareils non configurée');
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Token ${this.key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((error: unknown) => {
      this.logger.warn({ path, error: String(error) }, 'MobileAPI.dev injoignable');
      throw unavailable('DEVICE_SERVICE_UNAVAILABLE', 'Le service de fiches techniques ne répond pas');
    });
    if (!response.ok) {
      this.logger.warn({ path, status: response.status }, 'MobileAPI.dev a refusé la requête');
      throw response.status === 402 || response.status === 429
        ? unavailable('DEVICE_SERVICE_QUOTA', 'Quota du service de fiches techniques atteint')
        : unavailable('DEVICE_SERVICE_UNAVAILABLE', 'Le service de fiches techniques a refusé la requête');
    }
    return (await response.json()) as T;
  }
}

function toRecord(row: DeviceModel): DeviceRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerId: row.providerId,
    brand: row.brand,
    name: row.name,
    kind: row.kind as ProductKind,
    year: row.year,
    attributes: row.attributes as ProductAttributes,
    storages: row.storages,
    colors: row.colors as DeviceRecord['colors'],
    description: row.description,
  };
}

/** Catalogue partagé en base (table hors boutique : pas de filtre de tenant). */
@Injectable()
export class PrismaDeviceCatalog extends DeviceCatalog {
  constructor(@Inject(PRISMA) private readonly prisma: AppPrismaClient) {
    super();
  }

  async search(key: string, limit: number): Promise<DeviceRecord[]> {
    const words = key.split(' ').filter(Boolean).slice(0, 6);
    if (words.length === 0) return [];
    const rows = await this.prisma.deviceModel.findMany({
      where: { AND: words.map((word) => ({ searchName: { contains: word } })) },
      orderBy: [{ year: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<DeviceRecord | null> {
    const row = await this.prisma.deviceModel.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findByProviderIds(provider: string, providerIds: string[]): Promise<DeviceRecord[]> {
    if (providerIds.length === 0) return [];
    const rows = await this.prisma.deviceModel.findMany({ where: { provider, providerId: { in: providerIds } } });
    return rows.map(toRecord);
  }

  async save(record: Omit<DeviceRecord, 'id'>, raw: unknown, searchName: string): Promise<DeviceRecord> {
    const data = {
      brand: record.brand,
      name: record.name,
      searchName,
      kind: record.kind,
      year: record.year,
      attributes: record.attributes as Prisma.InputJsonValue,
      storages: record.storages,
      colors: record.colors as unknown as Prisma.InputJsonValue,
      description: record.description,
      raw: raw as Prisma.InputJsonValue,
    };
    const row = await this.prisma.deviceModel.upsert({
      where: { provider_providerId: { provider: record.provider, providerId: record.providerId } },
      create: { provider: record.provider, providerId: record.providerId, ...data },
      update: data,
    });
    return toRecord(row);
  }
}
