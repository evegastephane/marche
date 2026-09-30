import { z } from 'zod';
import type { ProductAttributes, ProductKind } from './storefront-vocabulary.js';

/**
 * Catalogue d'appareils : les fiches techniques connues (téléphones, tablettes, montres…),
 * partagées par toutes les boutiques. Un modèle cherché en ligne une fois y reste pour les suivantes.
 */
export const deviceSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
});
export type DeviceSearchQuery = z.infer<typeof deviceSearchQuerySchema>;

export type DeviceSource = 'catalog' | 'online';

/** Résultat de recherche : `ref` sert à importer la fiche (catalog:<id> ou online:<id du service>). */
export interface DeviceSearchHitDto {
  ref: string;
  brand: string;
  name: string;
  year: number | null;
  source: DeviceSource;
}

export interface DeviceSearchDto {
  items: DeviceSearchHitDto[];
  /** La recherche en ligne est branchée (clé du service configurée). */
  online: boolean;
}

export const importDeviceSchema = z.object({
  ref: z
    .string()
    .trim()
    .regex(/^(catalog|online):[\w-]{1,64}$/, { error: 'Référence d’appareil invalide' }),
});
export type ImportDeviceInput = z.infer<typeof importDeviceSchema>;

/** Fiche prête à préremplir un produit : attributs de la fiche technique, déclinaisons connues, description. */
export interface DeviceModelDto {
  id: string;
  brand: string;
  name: string;
  kind: ProductKind;
  year: number | null;
  attributes: ProductAttributes;
  /** Capacités de stockage commercialisées (« 128 Go »…), pour l'option Stockage. */
  storages: string[];
  /** Coloris commercialisés, en français quand le nom est connu, avec leur pastille si elle l'est. */
  colors: { value: string; hex: string | null }[];
  /** Description rédigée à partir de la fiche technique (le marchand la relit et la modifie). */
  description: string;
}
