import { z } from 'zod';

/**
 * Import du catalogue depuis un classeur Excel (.xlsx). Feuilles et colonnes en clair, colonnes de fiche
 * technique et d'axes nommées par attribut. Tout ou rien : au moindre défaut, rien n'est écrit.
 */

export const IMPORT_SHEETS = ['PRODUCTS', 'VARIANTS', 'ATTRIBUTES', 'ATTRIBUTE_VALUES', 'UNITS'] as const;
export type ImportSheet = (typeof IMPORT_SHEETS)[number];

/** Colonnes fixes de chaque feuille ; les attributs s'y ajoutent (PRODUCTS : fiche, VARIANTS : axes). */
export const IMPORT_COLUMNS = {
  PRODUCTS: ['reference', 'titre', 'categorie', 'marque', 'description', 'garantie_mois', 'statut'],
  VARIANTS: ['reference', 'sku', 'prix', 'prix_barre', 'prix_achat', 'stock', 'code_barres'],
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
}

export interface CatalogImportReportDto {
  dryRun: boolean;
  /** Aucun défaut : l'import peut être (ou a été) appliqué. */
  ok: boolean;
  issues: ImportIssueDto[];
  summary: CatalogImportSummaryDto;
}
