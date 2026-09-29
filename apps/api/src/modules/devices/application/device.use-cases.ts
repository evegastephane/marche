import { Injectable } from '@nestjs/common';
import type { DeviceModelDto, DeviceSearchDto, DeviceSearchHitDto } from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { JsonCache } from '../../../shared/infrastructure/cache/json-cache.js';
import { displayName, searchKey } from '../infrastructure/mobileapi.mapper.js';
import { DeviceCatalog, type DeviceRecord, DeviceSpecsProvider, type ProviderHit } from './devices.ports.js';

const LIMIT = 8;
/** Assez de fiches déjà connues : pas de requête en ligne (chaque requête coûte un crédit). */
const ENOUGH_LOCAL = 5;
const AUTOCOMPLETE_TTL = 24 * 60 * 60;

function toDto(record: DeviceRecord): DeviceModelDto {
  return {
    id: record.id,
    brand: record.brand,
    name: displayName(record.brand, record.name),
    kind: record.kind,
    year: record.year,
    attributes: record.attributes,
    storages: record.storages,
    colors: record.colors,
    description: record.description,
  };
}

/**
 * Fiches préremplies : on cherche d'abord dans le catalogue partagé, puis en ligne ; une fiche importée
 * reste au catalogue, et l'autocomplétion en ligne est gardée 24 h, pour ne payer chaque modèle qu'une fois.
 */
@Injectable()
export class DeviceUseCases {
  constructor(
    private readonly catalog: DeviceCatalog,
    private readonly provider: DeviceSpecsProvider,
    private readonly cache: JsonCache,
  ) {}

  async search(query: string): Promise<DeviceSearchDto> {
    const key = searchKey(query);
    const local = await this.catalog.search(key, LIMIT);
    const items: DeviceSearchHitDto[] = local.map((record) => ({
      ref: `catalog:${record.id}`,
      brand: record.brand,
      name: displayName(record.brand, record.name),
      year: record.year,
      source: 'catalog',
    }));
    if (this.provider.enabled && local.length < ENOUGH_LOCAL && key.length >= 3) {
      const online = await this.cache.getOrSet<ProviderHit[]>(`devices:autocomplete:${key}`, AUTOCOMPLETE_TTL, () =>
        this.provider.search(query, LIMIT),
      );
      const known = new Set(local.filter((r) => r.provider === this.provider.name).map((r) => r.providerId));
      for (const hit of online) {
        if (known.has(hit.providerId) || items.length >= LIMIT) continue;
        items.push({ ref: `online:${hit.providerId}`, brand: hit.brand, name: displayName(hit.brand, hit.name), year: hit.year, source: 'online' });
      }
    }
    return { items, online: this.provider.enabled };
  }

  /** Fiche d'un résultat : lue au catalogue, ou importée du service puis gardée au catalogue. */
  async get(ref: string): Promise<DeviceModelDto> {
    const [source, id] = ref.split(':') as ['catalog' | 'online', string];
    if (source === 'catalog') {
      const record = await this.catalog.findById(id);
      if (!record) throw new NotFoundError('Appareil', id);
      return toDto(record);
    }
    const [existing] = await this.catalog.findByProviderIds(this.provider.name, [id]);
    if (existing) return toDto(existing);
    const { device, raw } = await this.provider.fetch(id);
    const record = await this.catalog.save({ ...device, provider: this.provider.name }, raw, searchKey(displayName(device.brand, device.name)));
    return toDto(record);
  }
}
