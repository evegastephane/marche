import { z } from 'zod';
import type { SpecValue } from './catalog-model.js';

/**
 * Vocabulaire du site (DTO storefront rétrocompatible) : familles d'articles et natures d'options,
 * dérivées par l'API des catégories et des axes de chaque boutique. Les templates s'en servent pour
 * choisir un affichage (pastilles, grille de tailles, cartes « État »). La vérité du catalogue reste
 * dans les catégories et attributs de la boutique (taxonomy.ts).
 */

// ───────────── Natures d'options ─────────────

/** Nature d'une option de déclinaison : elle décide de son affichage (pastilles, grille, cartes). */
export const OPTION_TYPES = ['size', 'shoe_size', 'color', 'storage', 'memory', 'screen', 'condition', 'model', 'text'] as const;
export const optionTypeSchema = z.enum(OPTION_TYPES);
export type OptionType = z.infer<typeof optionTypeSchema>;

export const OPTION_TYPE_LABELS: Record<OptionType, string> = {
  size: 'Taille',
  shoe_size: 'Pointure',
  color: 'Couleur',
  storage: 'Stockage',
  memory: 'Mémoire vive',
  screen: 'Écran',
  condition: 'État',
  model: 'Modèle',
  text: 'Autre',
};

/** Nature d'une option d'après son nom (« Taille », « Couleur », « Stockage »…), pour les options saisies sans nature. */
export function inferOptionType(name: string): OptionType {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (n.includes('pointure')) return 'shoe_size';
  if (n.includes('taille') && !n.includes('ecran')) return 'size';
  if (n.includes('couleur') || n.includes('coloris')) return 'color';
  if (n.includes('stockage') || n.includes('capacite')) return 'storage';
  if (n.includes('memoire') || n.includes('ram')) return 'memory';
  if (n.includes('ecran')) return 'screen';
  if (n.includes('etat')) return 'condition';
  if (n.includes('modele')) return 'model';
  return 'text';
}

/** Couleurs proposées d'emblée, avec leur pastille. */
export const COLOR_PRESETS: { value: string; hex: string }[] = [
  { value: 'Noir', hex: '#111111' },
  { value: 'Blanc', hex: '#F5F5F2' },
  { value: 'Gris', hex: '#8E8E93' },
  { value: 'Argent', hex: '#C7C7CC' },
  { value: 'Or', hex: '#D4AF37' },
  { value: 'Bleu', hex: '#1F5FAE' },
  { value: 'Bleu nuit', hex: '#1B2A4A' },
  { value: 'Rouge', hex: '#C8102E' },
  { value: 'Vert', hex: '#2E7D32' },
  { value: 'Violet', hex: '#6A4C93' },
  { value: 'Rose', hex: '#F4A7B9' },
  { value: 'Jaune', hex: '#F2C94C' },
  { value: 'Orange', hex: '#F66B21' },
  { value: 'Beige', hex: '#D8C3A5' },
  { value: 'Marron', hex: '#7B4B2A' },
  { value: 'Kaki', hex: '#6B6B3A' },
];

/** Valeurs prêtes à cocher, par nature d'option (l'ordre est celui d'affichage). */
export const OPTION_PRESETS: Partial<Record<OptionType, string[]>> = {
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  shoe_size: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
  color: COLOR_PRESETS.map((c) => c.value),
  storage: ['64 Go', '128 Go', '256 Go', '512 Go', '1 To'],
  memory: ['8 Go', '16 Go', '32 Go'],
  screen: ['11 pouces', '13 pouces', '14 pouces', '15 pouces', '16 pouces'],
  condition: ['Neuf', 'Reconditionné – Excellent', 'Reconditionné – Très bon', 'Reconditionné – Bon'],
};

/** Option d'un produit telle que le site l'affiche : nom, valeurs dans l'ordre, nature et pastilles. */
export interface ProductOption {
  name: string;
  values: string[];
  type?: OptionType;
  /** Pastille de chaque couleur : valeur → #RRGGBB. */
  swatches?: Record<string, string>;
}

/** Pastille d'une couleur : celle choisie par la boutique, sinon celle du nuancier. */
export function swatchFor(option: { swatches?: Record<string, string> }, value: string): string | null {
  return option.swatches?.[value] ?? COLOR_PRESETS.find((c) => c.value.toLowerCase() === value.toLowerCase())?.hex ?? null;
}

// ───────────── Familles d'articles ─────────────

export const FASHION_KINDS = ['CLOTHING', 'SHOES', 'FASHION_ACCESSORY'] as const;
export const ELECTRONICS_KINDS = ['PHONE', 'TABLET', 'COMPUTER', 'WATCH', 'ACCESSORY'] as const;
export const PRODUCT_KINDS = [...FASHION_KINDS, ...ELECTRONICS_KINDS] as const;
export const productKindSchema = z.enum(PRODUCT_KINDS);
export type ProductKind = z.infer<typeof productKindSchema>;

/** Appareils auxquels on peut proposer des accessoires et des packs. */
export const DEVICE_KINDS: readonly ProductKind[] = ['PHONE', 'TABLET', 'COMPUTER', 'WATCH'];

export const KINDS: Record<ProductKind, { label: string; plural: string }> = {
  CLOTHING: { label: 'Vêtement', plural: 'Vêtements' },
  SHOES: { label: 'Chaussures', plural: 'Chaussures' },
  FASHION_ACCESSORY: { label: 'Accessoire de mode', plural: 'Accessoires' },
  PHONE: { label: 'Téléphone', plural: 'Téléphones' },
  TABLET: { label: 'Tablette', plural: 'Tablettes' },
  COMPUTER: { label: 'Ordinateur', plural: 'Ordinateurs' },
  WATCH: { label: 'Montre connectée', plural: 'Montres' },
  ACCESSORY: { label: 'Accessoire', plural: 'Accessoires' },
};

/**
 * Fiche aux clés d'avant le catalogue dynamique (model, screenSize, compatibleModels…) : celle des
 * fiches d'appareils MobileAPI, et la copie rétrocompatible `attributes` du DTO du site.
 */
export type ProductAttributes = Record<string, SpecValue>;

/** Normalise un nom de modèle pour la compatibilité : « iPhone 12 » = « iphone  12 ». */
export function modelKey(model: string): string {
  return model.normalize('NFKD').replace(/s+/g, ' ').trim().toLocaleLowerCase('fr');
}
