import { describe, expect, it, vi } from 'vitest';
import type { JsonCache } from '../../../shared/infrastructure/cache/json-cache.js';
import { DeviceUseCases } from './device.use-cases.js';
import { DeviceCatalog, type DeviceRecord, DeviceSpecsProvider, type ProviderHit } from './devices.ports.js';

const record = (overrides: Partial<DeviceRecord> = {}): DeviceRecord => ({
  id: 'd1',
  provider: 'mobileapi',
  providerId: '100',
  brand: 'Apple',
  name: 'iPhone 12',
  kind: 'PHONE',
  year: 2020,
  attributes: { model: 'iPhone 12' },
  storages: ['64 Go'],
  colors: [],
  description: 'Le Apple iPhone 12.',
  ...overrides,
});

class MemoryCatalog extends DeviceCatalog {
  rows: DeviceRecord[] = [];
  search = async (key: string) => this.rows.filter((r) => `${r.brand} ${r.name}`.toLowerCase().includes(key));
  findById = async (id: string) => this.rows.find((r) => r.id === id) ?? null;
  findByProviderIds = async (provider: string, ids: string[]) =>
    this.rows.filter((r) => r.provider === provider && ids.includes(r.providerId));
  save = vi.fn(async (input: Omit<DeviceRecord, 'id'>) => {
    const saved = { ...input, id: `d${this.rows.length + 1}` };
    this.rows.push(saved);
    return saved;
  });
}

class FakeProvider extends DeviceSpecsProvider {
  readonly name = 'mobileapi';
  enabled = true;
  search = vi.fn(
    async (): Promise<ProviderHit[]> => [
      { providerId: '100', brand: 'Apple', name: 'iPhone 12', year: 2020 },
      { providerId: '101', brand: 'Apple', name: 'iPhone 12 Pro', year: 2020 },
    ],
  );
  fetch = vi.fn(async (providerId: string) => ({
    device: {
      providerId,
      brand: 'Apple',
      name: 'iPhone 12 Pro',
      kind: 'PHONE' as const,
      year: 2020,
      attributes: {},
      storages: [],
      colors: [],
      description: 'x',
    },
    raw: { id: providerId },
  }));
}

/** Cache sans mémoire : chaque appel recalcule (la durée de vie est l'affaire de Redis). */
const passthrough = {
  getOrSet: async <T>(_key: string, _ttl: number, compute: () => Promise<T>) => compute(),
} as unknown as JsonCache;

describe('Catalogue d’appareils', () => {
  it('complète les fiches connues par la recherche en ligne, sans doublon', async () => {
    const catalog = new MemoryCatalog();
    catalog.rows.push(record());
    const provider = new FakeProvider();
    const result = await new DeviceUseCases(catalog, provider, passthrough).search('iphone 12');
    expect(result.online).toBe(true);
    expect(result.items.map((i) => [i.ref, i.source])).toEqual([
      ['catalog:d1', 'catalog'],
      ['online:101', 'online'],
    ]);
  });

  it('ne consulte pas le service quand le catalogue suffit, ni sans clé', async () => {
    const catalog = new MemoryCatalog();
    catalog.rows.push(...['a', 'b', 'c', 'd', 'e'].map((n, i) => record({ id: `d${i}`, providerId: n, name: `iPhone 12 ${n}` })));
    const provider = new FakeProvider();
    await new DeviceUseCases(catalog, provider, passthrough).search('iphone 12');
    expect(provider.search).not.toHaveBeenCalled();

    provider.enabled = false;
    const result = await new DeviceUseCases(new MemoryCatalog(), provider, passthrough).search('galaxy');
    expect(result).toEqual({ items: [], online: false });
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('importe une fiche en ligne une seule fois, puis la sert depuis le catalogue', async () => {
    const catalog = new MemoryCatalog();
    const provider = new FakeProvider();
    const devices = new DeviceUseCases(catalog, provider, passthrough);
    const first = await devices.get('online:101');
    expect(first).toMatchObject({ name: 'Apple iPhone 12 Pro', kind: 'PHONE' });
    await devices.get('online:101');
    expect(provider.fetch).toHaveBeenCalledTimes(1);
    expect(catalog.save).toHaveBeenCalledTimes(1);
  });
});
