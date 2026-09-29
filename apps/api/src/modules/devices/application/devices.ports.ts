import type { ProductAttributes, ProductKind } from '@marche/contracts';

/** Fiche du catalogue partagé (toutes boutiques). */
export interface DeviceRecord {
  id: string;
  provider: string;
  providerId: string;
  brand: string;
  name: string;
  kind: ProductKind;
  year: number | null;
  attributes: ProductAttributes;
  storages: string[];
  colors: { value: string; hex: string | null }[];
  description: string;
}

export interface ProviderHit {
  providerId: string;
  brand: string;
  name: string;
  year: number | null;
}

/** Service en ligne de fiches techniques (MobileAPI.dev). Chaque appel consomme des crédits payants. */
export abstract class DeviceSpecsProvider {
  abstract readonly name: string;
  /** Faux sans clé configurée : la recherche se limite alors au catalogue déjà importé. */
  abstract readonly enabled: boolean;
  abstract search(query: string, limit: number): Promise<ProviderHit[]>;
  /** Fiche complète normalisée, avec la réponse brute pour la garder. */
  abstract fetch(providerId: string): Promise<{ device: Omit<DeviceRecord, 'id' | 'provider'>; raw: unknown }>;
}

/** Catalogue partagé : lecture et écriture système, hors boutique. */
export abstract class DeviceCatalog {
  abstract search(key: string, limit: number): Promise<DeviceRecord[]>;
  abstract findById(id: string): Promise<DeviceRecord | null>;
  abstract findByProviderIds(provider: string, providerIds: string[]): Promise<DeviceRecord[]>;
  abstract save(record: Omit<DeviceRecord, 'id'>, raw: unknown, searchName: string): Promise<DeviceRecord>;
}
