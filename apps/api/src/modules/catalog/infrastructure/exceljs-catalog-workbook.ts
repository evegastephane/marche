import { Injectable } from '@nestjs/common';
import {
  ATTRIBUTE_TYPE_LABELS,
  categoryPath,
  IMPORT_COLUMNS,
  IMPORT_REQUIRED_COLUMNS,
  IMPORT_SHEETS,
  type ImportIssueDto,
  type ImportSheet,
  MAX_IMPORT_ROWS,
  resolveCategoryAttributes,
} from '@marche/contracts';
import ExcelJS from 'exceljs';
import {
  type CellValue,
  CatalogWorkbook,
  type ParsedWorkbook,
  type WorkbookSheet,
  type WorkbookTemplateInput,
} from '../application/catalog-import/catalog-workbook.port.js';
import { columnKey } from '../application/catalog-import/import-cells.js';

const INK = 'FF101115';
const PAPER = 'FFF2F2EF';
const ACCENT = 'FFF66B21';

/** Valeur exceljs ramenée à un type simple : formule → résultat, texte riche → texte, date → AAAA-MM-JJ. */
function plainCell(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('result' in value) return plainCell((value.result ?? null) as ExcelJS.CellValue);
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('error' in value) return null;
  }
  return null;
}

@Injectable()
export class ExcelJsCatalogWorkbook extends CatalogWorkbook {
  async read(buffer: Buffer): Promise<ParsedWorkbook> {
    const workbook = new ExcelJS.Workbook();
    const issues: ImportIssueDto[] = [];
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      return { sheets: {}, issues: [{ sheet: null, row: null, column: null, message: 'Fichier illisible : enregistrez-le au format Excel (.xlsx).' }] };
    }
    const sheets: ParsedWorkbook['sheets'] = {};
    for (const worksheet of workbook.worksheets) {
      const name = worksheet.name.trim().toUpperCase().replace(/[\s-]+/g, '_') as ImportSheet;
      if (!(IMPORT_SHEETS as readonly string[]).includes(name)) continue;
      const headerRow = worksheet.getRow(1);
      const headers: WorkbookSheet['headers'] = [];
      const columns = new Map<number, string>();
      headerRow.eachCell((cell, column) => {
        const label = String(plainCell(cell.value) ?? '').trim();
        if (!label) return;
        const key = columnKey(label);
        if (headers.some((header) => header.key === key)) {
          issues.push({ sheet: name, row: 1, column: label, message: `Colonne « ${label} » en double` });
          return;
        }
        headers.push({ key, label });
        columns.set(column, key);
      });
      const rows: WorkbookSheet['rows'] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const cells: Record<string, CellValue> = {};
        let filled = false;
        row.eachCell((cell, column) => {
          const key = columns.get(column);
          if (!key) return;
          const value = plainCell(cell.value);
          if (value !== null && String(value).trim() !== '') filled = true;
          cells[key] = value;
        });
        if (filled) rows.push({ row: rowNumber, cells });
      });
      if (rows.length > MAX_IMPORT_ROWS) {
        issues.push({ sheet: name, row: null, column: null, message: `${rows.length} lignes : ${MAX_IMPORT_ROWS} au plus par feuille` });
      }
      sheets[name] = { headers, rows };
    }
    if (!sheets.PRODUCTS && !sheets.VARIANTS && !sheets.ATTRIBUTES && !sheets.ATTRIBUTE_VALUES && !sheets.UNITS) {
      issues.push({
        sheet: null,
        row: null,
        column: null,
        message: 'Aucune feuille reconnue : partez du modèle (PRODUCTS, VARIANTS, ATTRIBUTES, ATTRIBUTE_VALUES, UNITS).',
      });
    }
    return { sheets, issues };
  }

  async template(input: WorkbookTemplateInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Upsell';
    workbook.created = new Date();
    const specs = input.attributes.filter((attribute) => !attribute.isVariantAxis);
    const axes = input.attributes.filter((attribute) => attribute.isVariantAxis);

    const readme = workbook.addWorksheet('LISEZ-MOI', { properties: { tabColor: { argb: ACCENT } } });
    readme.columns = [{ width: 110 }];
    const lines = [
      `Import du catalogue · ${input.storeName}`,
      '',
      'PRODUCTS : une ligne par produit. reference = code modèle (IP17P), unique ; categorie = slug ou nom (feuille CATEGORIES).',
      'Les colonnes après « statut » sont la fiche technique : remplissez celles de la catégorie du produit.',
      'VARIANTS : une ligne par variante, rattachée au produit par sa reference. Les colonnes après « code_barres » sont les axes (stockage, couleur…).',
      `Montants en ${input.currency}, sans symbole (25000). stock = stock voulu : l’écart devient un mouvement « Import Excel ».`,
      'Suivi à l’unité (téléphones…) : laissez « stock » vide et listez les IMEI dans la feuille UNITS (sku, imei, batterie).',
      'ATTRIBUTES et ATTRIBUTE_VALUES : facultatives, pour créer des attributs ou ajouter des valeurs avant les produits.',
      'Colonnes en orange : obligatoires. statut : « en vente » ou « brouillon » (vide = inchangé).',
      'Réimporter le même fichier met à jour sans rien dupliquer (produits par reference, variantes par sku).',
      'Au moindre défaut, rien n’est écrit : le tableau de bord liste chaque erreur avec sa feuille, sa ligne et sa colonne.',
    ];
    lines.forEach((line, index) => {
      const cell = readme.getCell(index + 1, 1);
      cell.value = line;
      cell.font = index === 0 ? { bold: true, size: 14, color: { argb: INK } } : { size: 11, color: { argb: INK } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });

    const sheet = (name: ImportSheet, extra: { key: string; label: string; note: string }[] = []) => {
      const worksheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
      const fixed = IMPORT_COLUMNS[name].map((key) => ({ key, label: key, note: '' }));
      const all = [...fixed, ...extra];
      worksheet.columns = all.map((column) => ({ header: column.label, key: column.key, width: Math.max(14, column.label.length + 4) }));
      const header = worksheet.getRow(1);
      header.height = 22;
      all.forEach((column, index) => {
        const cell = header.getCell(index + 1);
        const required = IMPORT_REQUIRED_COLUMNS[name].includes(column.key);
        cell.font = { bold: true, color: { argb: required ? 'FF101115' : INK } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: required ? ACCENT : PAPER } };
        cell.alignment = { vertical: 'middle' };
        if (column.note) cell.note = column.note;
      });
      return worksheet;
    };

    sheet(
      'PRODUCTS',
      specs.map((attribute) => ({
        key: attribute.slug,
        label: attribute.slug,
        note: `${attribute.name} · ${ATTRIBUTE_TYPE_LABELS[attribute.type]}${attribute.unit ? ` (${attribute.unit})` : ''}${
          attribute.values.length > 0 ? ` : ${attribute.values.map((value) => value.value).join(', ')}` : ''
        }`,
      })),
    );
    sheet(
      'VARIANTS',
      axes.map((attribute) => ({
        key: attribute.slug,
        label: attribute.slug,
        note: `${attribute.name} : ${attribute.values.map((value) => value.value).join(', ')}`,
      })),
    );
    sheet('UNITS');
    sheet('ATTRIBUTES');
    sheet('ATTRIBUTE_VALUES');

    const reference = workbook.addWorksheet('CATEGORIES', { views: [{ state: 'frozen', ySplit: 1 }] });
    reference.columns = [
      { header: 'slug', key: 'slug', width: 26 },
      { header: 'chemin', key: 'chemin', width: 44 },
      { header: 'suivi_unite', key: 'suivi', width: 12 },
      { header: 'fiche technique (* obligatoire)', key: 'fiche', width: 70 },
      { header: 'axes de variante', key: 'axes', width: 40 },
    ];
    reference.getRow(1).font = { bold: true };
    for (const category of input.categories) {
      const path = categoryPath(category.id, input.categories);
      const effective = resolveCategoryAttributes(category.id, input.categories, input.attributes, input.links);
      const label = (attribute: (typeof effective)[number]) => `${attribute.slug}${attribute.required ? '*' : ''}`;
      reference.addRow({
        slug: category.slug,
        chemin: path.map((step) => step.name).join(' › '),
        suivi: path.some((step) => step.tracksUnits) ? 'oui' : '',
        fiche: effective.filter((attribute) => !attribute.isVariantAxis).map(label).join(', '),
        axes: effective.filter((attribute) => attribute.isVariantAxis).map(label).join(', '),
      });
    }
    const products = workbook.getWorksheet('PRODUCTS');
    const lastCategory = input.categories.length + 1;
    if (products && input.categories.length > 0) {
      for (let row = 2; row <= 1000; row++) {
        products.getCell(row, 3).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`CATEGORIES!$A$2:$A$${lastCategory}`],
          showErrorMessage: false,
        };
      }
    }

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }
}
