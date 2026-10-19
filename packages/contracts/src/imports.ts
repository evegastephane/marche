import { z } from 'zod';

/**
 * Import du catalogue depuis un classeur Excel (.xlsx). Feuilles et colonnes en clair, colonnes de fiche
 * technique et d'axes nommées par attribut. Tout ou rien : au moindre défaut, rien n'est écrit.
 */

export const IMPORT_SHEETS = ['PRODUCTS', 'VARIANTS', 'ATTRIBUTES', 'ATTRIBUTE_VALUES', 'UNITS'] as const;
export type ImportSheet = (typeof IMPORT_SHEETS)[number];

/** Colonnes fixes de chaque feuille ; les attributs s'y ajoutent (PRODUCTS : fiche, VARIANTS : axes). */
export const IMPORT_COLUMNS = {
  PRODUCTS: ['reference', 'titre', 'categorie', 'marque', 'description', 'garantie_mois', 'statut', 'images'],
  VARIANTS: ['reference', 'sku', 'prix', 'prix_barre', 'prix_achat', 'stock', 'code_barres', 'image'],
  ATTRIBUTES: ['slug', 'nom', 'type', 'unite', 'axe', 'filtre', 'categories', 'obligatoire'],
  ATTRIBUTE_VALUES: ['attribut', 'valeur', 'code', 'pastille'],
  UNITS: ['sku', 'imei', 'batterie'],
} as const satisfies Record<ImportSheet, readonly string[]>;

/** Colonnes obligatoires (en plus des attributs obligatoires de la catégorie). */
export const IMPORT_REQUIRED_COLUMNS: Record<ImportSheet, readonly string[]> = {
  PRODUCTS: ['reference', 'titre', 'categorie'],
  VARIANTS: ['reference', 'sku', 'prix'],
  ATTRIBUTES: ['nom', 'type'],
  ATTRIBUTE_VALUES: ['attribut', 'valeur'],
  UNITS: ['sku', 'imei'],
};

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Longueur maximale d'un lien de photo. */
export const MAX_IMAGE_URL_LENGTH = 2048;

/**
 * Liens de photos d'une cellule (« images » d'un produit, « image » d'une variante) : séparés par
 * « | », « ; », des espaces ou des retours à la ligne. Seuls les liens https sont acceptés.
 */
export function parseImageUrls(raw: string): { urls: string[]; invalid: string[] } {
  const urls: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[|;\s]+/)) {
    const candidate = part.trim();
    if (!candidate) continue;
    let url: URL | null = null;
    try {
      url = new URL(candidate);
    } catch {
      url = null;
    }
    if (!url || url.protocol !== 'https:' || candidate.length > MAX_IMAGE_URL_LENGTH || !url.hostname.includes('.')) {
      invalid.push(candidate);
      continue;
    }
    if (!urls.includes(url.href)) urls.push(url.href);
  }
  return { urls, invalid };
}
export const MAX_IMPORT_ROWS = 5000;

export const catalogImportQuerySchema = z.object({
  /** true : tout vérifier sans rien écrire (par défaut). */
  dryRun: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});
export type CatalogImportQuery = z.infer<typeof catalogImportQuerySchema>;

export interface ImportIssueDto {
  /** Feuille concernée, ou null pour le fichier entier. */
  sheet: ImportSheet | null;
  /** Numéro de ligne tel qu'Excel l'affiche (l'en-tête est la ligne 1). */
  row: number | null;
  column: string | null;
  message: string;
}

export interface CatalogImportSummaryDto {
  attributesCreated: number;
  valuesCreated: number;
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  /** Variantes existantes dont le stock a été ramené à la colonne « stock ». */
  stockAdjusted: number;
  unitsReceived: number;
  /** Photos du fichier (liens distincts) : téléchargées à l'import, réutilisées si déjà importées. */
  images: number;
}

export interface CatalogImportReportDto {
  dryRun: boolean;
  /** Aucun défaut : l'import peut être (ou a été) appliqué. */
  ok: boolean;
  issues: ImportIssueDto[];
  summary: CatalogImportSummaryDto;
}
