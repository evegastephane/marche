import {
  ATTRIBUTE_TYPES,
  type AttributeType,
  CURRENCY_EXPONENT,
  type Currency,
  slugify,
  type TaxonomyAttribute,
  valueKey,
} from '@marche/contracts';
import type { CellValue } from './catalog-workbook.port.js';

/**
 * Conversions des cellules d'un classeur d'import : en-têtes, textes, nombres à la française,
 * oui/non, montants, listes. Fonctions pures, sans accès à la base.
 */

/** En-tête normalisé : « Garantie (mois) » → garantie_mois, « taille-ecran » → taille_ecran. */
export function columnKey(label: string): string {
  return slugify(label).replace(/-/g, '_');
}

/** Colonne d'un attribut : par son slug ou par son nom. */
export function attributeForColumn<T extends Pick<TaxonomyAttribute, 'slug' | 'name'>>(key: string, attributes: readonly T[]): T | undefined {
  return attributes.find((attribute) => columnKey(attribute.slug) === key || columnKey(attribute.name) === key);
}

export function isBlank(value: CellValue | undefined): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export function text(value: CellValue | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/** Nombre saisi en chiffres ou en texte (« 6,1 », « 25 000 ») ; null si ce n'en est pas un. */
export function decimal(value: CellValue | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\s  ]/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

export function integer(value: CellValue | undefined): number | null {
  const number = decimal(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

/** Montant en unités de la devise (« 25 000 » FCFA, « 12,50 » €) → unités mineures. */
export function amount(value: CellValue | undefined, currency: Currency): number | null {
  const number = decimal(value);
  if (number === null || number < 0) return null;
  const minor = Math.round(number * 10 ** CURRENCY_EXPONENT[currency]);
  return Number.isSafeInteger(minor) ? minor : null;
}

const YES = new Set(['oui', 'o', 'yes', 'y', 'vrai', 'true', '1', 'x']);
const NO = new Set(['non', 'n', 'no', 'faux', 'false', '0']);

export function yesNo(value: CellValue | undefined): boolean | null {
  if (typeof value === 'boolean') return value;
  const key = valueKey(text(value));
  if (YES.has(key)) return true;
  if (NO.has(key)) return false;
  return null;
}

/** Liste séparée par des virgules, points-virgules ou retours à la ligne. */
export function list(value: CellValue | undefined): string[] {
  return text(value)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const TYPE_ALIASES: Record<string, AttributeType> = {
  texte: 'TEXT',
  nombre: 'NUMBER',
  liste: 'SELECT',
  choix: 'SELECT',
  'liste un choix': 'SELECT',
  'liste (un choix)': 'SELECT',
  'liste multiple': 'MULTI_SELECT',
  'liste plusieurs choix': 'MULTI_SELECT',
  'liste (plusieurs choix)': 'MULTI_SELECT',
  'oui/non': 'BOOLEAN',
  'oui / non': 'BOOLEAN',
  booleen: 'BOOLEAN',
};

/** Type d'attribut en clair (« Nombre », « liste multiple ») ou en code (NUMBER). */
export function attributeType(value: CellValue | undefined): AttributeType | null {
  const raw = text(value);
  const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if ((ATTRIBUTE_TYPES as readonly string[]).includes(upper)) return upper as AttributeType;
  return TYPE_ALIASES[valueKey(raw)] ?? null;
}

/** Statut en clair : en vente / brouillon ; null = inchangé (vide). */
export function publishFlag(value: CellValue | undefined): boolean | 'invalid' | null {
  const key = valueKey(text(value));
  if (!key) return null;
  if (['en vente', 'actif', 'active', 'publie', 'publiee', 'oui'].includes(key)) return true;
  if (['brouillon', 'draft', 'non', 'inactif'].includes(key)) return false;
  return 'invalid';
}

/**
 * Valeur de fiche technique lue selon le type de l'attribut ; `validateSpecs` fait ensuite
 * les contrôles métier (valeur connue, bornes). Renvoie un message si la cellule est illisible.
 */
export function specCell(attribute: Pick<TaxonomyAttribute, 'type'>, value: CellValue): unknown {
  switch (attribute.type) {
    case 'NUMBER':
      return decimal(value) ?? { error: 'Nombre attendu' };
    case 'BOOLEAN':
      return yesNo(value) ?? { error: 'Oui ou non attendu' };
    case 'MULTI_SELECT':
      return list(value);
    case 'SELECT':
    case 'TEXT':
      return text(value);
  }
}
