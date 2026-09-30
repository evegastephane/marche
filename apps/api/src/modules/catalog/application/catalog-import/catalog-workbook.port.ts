import type { Currency, ImportIssueDto, ImportSheet, TaxonomyAttribute, TaxonomyCategory, TaxonomyLink } from '@marche/contracts';

/** Valeur d'une cellule, ramenée à un type simple (formules : leur résultat ; texte riche : son texte). */
export type CellValue = string | number | boolean | null;

export interface WorkbookRow {
  /** Numéro de ligne tel qu'Excel l'affiche. */
  row: number;
  /** Cellules par en-tête normalisé (voir `columnKey`). */
  cells: Record<string, CellValue>;
}

export interface WorkbookSheet {
  /** En-têtes normalisés, dans l'ordre, avec leur libellé d'origine. */
  headers: { key: string; label: string }[];
  rows: WorkbookRow[];
}

export interface ParsedWorkbook {
  sheets: Partial<Record<ImportSheet, WorkbookSheet>>;
  /** Défauts de lecture (fichier illisible, trop de lignes…). */
  issues: ImportIssueDto[];
}

export interface WorkbookTemplateInput {
  storeName: string;
  currency: Currency;
  categories: TaxonomyCategory[];
  attributes: TaxonomyAttribute[];
  links: TaxonomyLink[];
}

/** Lecture et génération des classeurs d'import (implémentation : exceljs). */
export abstract class CatalogWorkbook {
  abstract read(buffer: Buffer): Promise<ParsedWorkbook>;
  abstract template(input: WorkbookTemplateInput): Promise<Buffer>;
}
