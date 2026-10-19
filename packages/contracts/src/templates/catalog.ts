import type { StoreType } from '../verticals.js';
import type { TemplateManifest } from './define.js';

/**
 * Classement des modèles pour la galerie du dashboard : secteurs (à l'intérieur d'un type de boutique)
 * et styles. Le catalogue est appelé à grandir ; ces listes sont la grille commune de tous les modèles.
 */

export const TEMPLATE_SECTORS = {
  ELECTRONICS: [
    { id: 'telephones', label: 'Téléphones' },
    { id: 'informatique', label: 'Informatique' },
    { id: 'audio', label: 'Audio et son' },
    { id: 'gaming', label: 'Jeux vidéo' },
    { id: 'accessoires-tech', label: 'Accessoires' },
  ],
  FASHION: [
    { id: 'pret-a-porter', label: 'Prêt-à-porter' },
    { id: 'couture', label: 'Couture et sur mesure' },
    { id: 'chaussures', label: 'Chaussures' },
    { id: 'accessoires-mode', label: 'Sacs et accessoires' },
  ],
} as const satisfies Record<StoreType, readonly { id: string; label: string }[]>;
export type TemplateSector = (typeof TEMPLATE_SECTORS)[StoreType][number]['id'];

export const TEMPLATE_STYLES = [
  { id: 'epure', label: 'Épuré' },
  { id: 'audacieux', label: 'Audacieux' },
  { id: 'lumineux', label: 'Lumineux' },
  { id: 'editorial', label: 'Éditorial' },
  { id: 'artisanal', label: 'Artisanal' },
  { id: 'retro', label: 'Rétro' },
] as const;
export type TemplateStyle = (typeof TEMPLATE_STYLES)[number]['id'];

export function sectorLabel(id: string): string {
  return Object.values(TEMPLATE_SECTORS)
    .flat()
    .find((sector) => sector.id === id)?.label ?? id;
}

export function styleLabel(id: string): string {
  return TEMPLATE_STYLES.find((style) => style.id === id)?.label ?? id;
}

/** Recherche et filtres de la galerie ; tous facultatifs. */
export interface TemplateQuery {
  q?: string;
  sector?: string;
  style?: string;
  tier?: TemplateManifest['tier'];
}

/** « Épuré », « epure », « EPURE » : la recherche ignore les accents et la casse. */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Les modèles qui répondent à la recherche (nom, idée, secteurs, styles) et aux filtres, dans l'ordre reçu. */
export function filterTemplates<T extends { manifest: TemplateManifest }>(templates: readonly T[], query: TemplateQuery): T[] {
  const words = fold(query.q ?? '').split(/\s+/).filter(Boolean);
  return templates.filter(({ manifest }) => {
    if (query.sector && !manifest.sectors.includes(query.sector as TemplateSector)) return false;
    if (query.style && !manifest.styles.includes(query.style as TemplateStyle)) return false;
    if (query.tier && manifest.tier !== query.tier) return false;
    if (words.length === 0) return true;
    const haystack = fold(
      [manifest.name, manifest.tagline, ...manifest.sectors.map(sectorLabel), ...manifest.styles.map(styleLabel)].join(' '),
    );
    return words.every((word) => haystack.includes(word));
  });
}
