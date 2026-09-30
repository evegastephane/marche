import type { AttributeType } from './taxonomy.js';

/**
 * Modèle du catalogue dynamique (catégories, attributs, variantes) : fonctions pures partagées
 * par l'API (qui décide) et le dashboard (qui prévisualise). Aucune dépendance au transport.
 */

/** Texte sans accents, pour comparer et fabriquer des codes. */
function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Clé de comparaison d'une valeur saisie : « Noir » = « noir » = « NOIR ». */
export function valueKey(value: string): string {
  return plain(value).replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
}

/** Slug d'une catégorie ou d'un attribut : « Taille écran » → « taille-ecran ». */
export function slugify(text: string): string {
  return (
    plain(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'element'
  );
}

const MAX_CODE_LENGTH = 8;

/**
 * Segment de SKU proposé pour une valeur : « 256 Go » → 256, « 1 To » → 1T, « 1,5 m » → 15M,
 * « 45 mm » → 45, « Noir » → NOI, « Bleu nuit » → BLN. La boutique peut le réécrire.
 */
export function valueCode(value: string): string {
  return abbreviate(value, MAX_CODE_LENGTH);
}

const MAX_MODEL_CODE_LENGTH = 12;

/** Code modèle proposé pour la référence d'un produit : « iPhone 17 Pro » → IP17P, « AirPods Pro 3 » → AIP3. */
export function modelCode(title: string): string {
  return abbreviate(title, MAX_MODEL_CODE_LENGTH);
}

function abbreviate(value: string, max: number): string {
  const text = plain(value).trim();
  const measure = /^(\d+(?:[.,]\d+)?)\s*([a-z]+)$/i.exec(text);
  if (measure) {
    const digits = (measure[1] ?? '').replace(/[.,]/g, '');
    const unit = (measure[2] ?? '').toLowerCase();
    if (unit === 'go' || unit === 'gb' || unit === 'mm') return digits;
    if (unit === 'to' || unit === 'tb') return `${digits}T`;
    if (unit === 'm') return `${digits}M`;
    return `${digits}${unit.slice(0, 2).toUpperCase()}`.slice(0, max);
  }
  const words = text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return 'X';
  const [first = '', ...rest] = words;
  if (rest.length === 0) return /^\d+$/.test(first) ? first.slice(0, max) : first.slice(0, 3);
  const head = /^\d+$/.test(first) ? first : first.slice(0, 2);
  const tail = rest.map((word) => (/^\d+$/.test(word) ? word : word.slice(0, 1))).join('');
  return `${head}${tail}`.slice(0, max);
}

// ───────────── Variantes ─────────────

/** Valeurs des axes d'une variante : { "stockage": "256 Go", "couleur": "Noir" } ; {} = variante par défaut. */
export type VariantOptions = Record<string, string>;

/**
 * Clé canonique d'une combinaison, indépendante de l'ordre des axes et de la casse :
 * { stockage: '256 Go', couleur: 'Noir' } → « couleur=noir|stockage=256 go ». Chaîne vide pour la variante par défaut.
 */
export function combinationKey(options: Readonly<VariantOptions>): string {
  return Object.keys(options)
    .sort()
    .map((slug) => `${slug}=${valueKey(options[slug] ?? '')}`)
    .join('|');
}

/** Libellé d'une variante dans l'ordre des axes : « 256 Go / Noir », ou « Par défaut ». */
export function variantTitle(options: Readonly<VariantOptions>, axisOrder: readonly string[] = []): string {
  const ordered = [...axisOrder.filter((slug) => slug in options), ...Object.keys(options).filter((slug) => !axisOrder.includes(slug))];
  const values = ordered.map((slug) => options[slug]).filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(' / ') : 'Par défaut';
}

/** Toutes les combinaisons des valeurs cochées (produit cartésien) ; sans axe, une variante par défaut. */
export function generateCombinations(axes: readonly { slug: string; values: readonly string[] }[]): VariantOptions[] {
  return axes
    .filter((axis) => axis.values.length > 0)
    .reduce<VariantOptions[]>(
      (combinations, axis) => combinations.flatMap((prefix) => axis.values.map((value) => ({ ...prefix, [axis.slug]: value }))),
      [{}],
    );
}

// ───────────── Catégories et attributs effectifs ─────────────

export interface TaxonomyValue {
  value: string;
  /** Segment de SKU. */
  code: string;
  swatch: string | null;
}

export interface TaxonomyAttribute {
  id: string;
  slug: string;
  name: string;
  type: AttributeType;
  unit: string | null;
  isVariantAxis: boolean;
  filterable: boolean;
  values: TaxonomyValue[];
}

export interface TaxonomyCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  tracksUnits: boolean;
}

export interface TaxonomyLink {
  categoryId: string;
  attributeId: string;
  required: boolean;
  position: number;
}

/** Attribut proposé par une catégorie, en tenant compte de l'héritage. */
export interface EffectiveAttribute extends TaxonomyAttribute {
  required: boolean;
  /** Catégorie qui déclare l'attribut (la catégorie elle-même ou un parent). */
  sourceCategoryId: string;
  inherited: boolean;
}

/** Chemin racine → catégorie. Lève une erreur sur une catégorie inconnue ou un cycle. */
export function categoryPath(categoryId: string, categories: readonly TaxonomyCategory[]): TaxonomyCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: TaxonomyCategory[] = [];
  const seen = new Set<string>();
  for (let current = byId.get(categoryId); current; current = current.parentId ? byId.get(current.parentId) : undefined) {
    if (seen.has(current.id)) throw new Error(`Cycle dans l'arbre des catégories (${current.id})`);
    seen.add(current.id);
    path.unshift(current);
  }
  if (path.length === 0) throw new Error(`Catégorie inconnue (${categoryId})`);
  return path;
}

/** La catégorie et toutes ses sous-catégories (filtre « rayon entier »), dans l'ordre de parcours. */
export function categoryDescendants(
  categoryId: string,
  categories: readonly Pick<TaxonomyCategory, 'id' | 'parentId'>[],
): string[] {
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (category.parentId) children.set(category.parentId, [...(children.get(category.parentId) ?? []), category.id]);
  }
  const found: string[] = [];
  const seen = new Set<string>();
  const stack = [categoryId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    found.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return found;
}

/** Suivi à l'unité (IMEI) : vrai si la catégorie ou l'un de ses parents le demande. */
export function categoryTracksUnits(categoryId: string, categories: readonly TaxonomyCategory[]): boolean {
  return categoryPath(categoryId, categories).some((category) => category.tracksUnits);
}

/**
 * Attributs d'une catégorie, hérités compris (règle 2) : ceux des parents d'abord, de la racine vers
 * la catégorie, chacun dans son ordre. Un attribut déclaré à plusieurs niveaux garde la place du
 * premier et prend le caractère obligatoire du plus proche de la catégorie.
 */
export function resolveCategoryAttributes(
  categoryId: string,
  categories: readonly TaxonomyCategory[],
  attributes: readonly TaxonomyAttribute[],
  links: readonly TaxonomyLink[],
): EffectiveAttribute[] {
  const byId = new Map(attributes.map((attribute) => [attribute.id, attribute]));
  const resolved = new Map<string, EffectiveAttribute>();
  for (const category of categoryPath(categoryId, categories)) {
    const own = links.filter((link) => link.categoryId === category.id).sort((a, b) => a.position - b.position);
    for (const link of own) {
      const attribute = byId.get(link.attributeId);
      if (!attribute) continue;
      const inherited = category.id !== categoryId;
      const existing = resolved.get(attribute.id);
      resolved.set(
        attribute.id,
        existing
          ? { ...existing, required: link.required, sourceCategoryId: category.id, inherited }
          : { ...attribute, required: link.required, sourceCategoryId: category.id, inherited },
      );
    }
  }
  return [...resolved.values()];
}

// ───────────── SKU ─────────────

const SKU_MAX_LENGTH = 64;

function skuSegment(text: string): string {
  return plain(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 16);
}

/**
 * SKU proposé (règle 5) : {MODELE}-{valeur de chaque axe, dans l'ordre des axes},
 * ex. IP17P-256-12G-BLK. Le code d'une valeur vient de l'attribut (modifiable par la boutique).
 */
export function suggestSku(
  reference: string,
  options: Readonly<VariantOptions>,
  axes: readonly Pick<TaxonomyAttribute, 'slug' | 'values'>[],
): string {
  const segments = [skuSegment(reference) || 'ART'];
  for (const axis of axes) {
    const value = options[axis.slug];
    if (!value) continue;
    const known = axis.values.find((candidate) => valueKey(candidate.value) === valueKey(value));
    segments.push(skuSegment(known?.code ?? valueCode(value)) || 'X');
  }
  return segments.join('-').slice(0, SKU_MAX_LENGTH).replace(/-+$/g, '');
}

/** SKU libre : « IP17P-256 » déjà pris → « IP17P-256-2 », puis « -3 »… */
export function dedupeSku(sku: string, isTaken: (candidate: string) => boolean): string {
  if (!isTaken(sku)) return sku;
  for (let attempt = 2; attempt < 1000; attempt++) {
    const suffix = `-${attempt}`;
    const candidate = `${sku.slice(0, SKU_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!isTaken(candidate)) return candidate;
  }
  throw new Error(`Aucun SKU libre pour ${sku}`);
}

// ───────────── Fiche technique ─────────────

export type SpecValue = string | number | boolean | string[];
export type ProductSpecs = Record<string, SpecValue>;

const MAX_TEXT_SPEC = 500;
const MAX_NUMBER_SPEC = 1_000_000_000;

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

/** Libellé enregistré d'une valeur de liste (comparaison sans casse ni accents), ou null si elle n'existe pas. */
export function canonicalValue(attribute: Pick<TaxonomyAttribute, 'values'>, value: string): string | null {
  const key = valueKey(value);
  return attribute.values.find((candidate) => valueKey(candidate.value) === key)?.value ?? null;
}

/**
 * Nettoie et valide la fiche technique d'un produit selon les attributs (hors axes) de sa catégorie :
 * clés inconnues retirées, valeurs vides supprimées, type de chaque valeur vérifié, valeurs de liste
 * ramenées à leur libellé enregistré. Les erreurs sont rendues par slug d'attribut.
 */
export function validateSpecs(
  attributes: readonly TaxonomyAttribute[],
  input: Readonly<Record<string, unknown>>,
): { specs: ProductSpecs; errors: Record<string, string> } {
  const specs: ProductSpecs = {};
  const errors: Record<string, string> = {};
  for (const attribute of attributes) {
    if (attribute.isVariantAxis) continue;
    const value = input[attribute.slug];
    if (isEmpty(value)) continue;
    switch (attribute.type) {
      case 'TEXT':
        if (typeof value !== 'string') errors[attribute.slug] = 'Texte attendu';
        else if (value.trim().length > MAX_TEXT_SPEC) errors[attribute.slug] = `${MAX_TEXT_SPEC} caractères maximum`;
        else if (value.trim()) specs[attribute.slug] = value.trim();
        break;
      case 'NUMBER':
        if (typeof value !== 'number' || !Number.isFinite(value)) errors[attribute.slug] = 'Nombre attendu';
        else if (value < 0 || value > MAX_NUMBER_SPEC) errors[attribute.slug] = 'Nombre hors limites';
        else specs[attribute.slug] = value;
        break;
      case 'BOOLEAN':
        if (typeof value !== 'boolean') errors[attribute.slug] = 'Oui ou non attendu';
        else specs[attribute.slug] = value;
        break;
      case 'SELECT': {
        const label = typeof value === 'string' ? canonicalValue(attribute, value) : null;
        if (label === null) errors[attribute.slug] = 'Choix inconnu';
        else specs[attribute.slug] = label;
        break;
      }
      case 'MULTI_SELECT': {
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
          errors[attribute.slug] = 'Liste attendue';
          break;
        }
        const items = value as string[];
        const labels = items.map((item) => canonicalValue(attribute, item));
        const unknown = items.filter((_, index) => labels[index] === null);
        if (unknown.length > 0) errors[attribute.slug] = `Choix inconnu : ${unknown.join(', ')}`;
        else specs[attribute.slug] = [...new Set(labels as string[])];
        break;
      }
    }
  }
  return { specs, errors };
}

/**
 * Valeurs d'axes d'une variante : chaque clé est un axe de la catégorie, chaque valeur l'une des siennes
 * (ramenée à son libellé enregistré). Renvoie les options canoniques ou un message d'erreur.
 */
export function validateVariantOptions(
  axes: readonly TaxonomyAttribute[],
  input: Readonly<Record<string, unknown>>,
): { options: VariantOptions } | { error: string } {
  const bySlug = new Map(axes.filter((axis) => axis.isVariantAxis).map((axis) => [axis.slug, axis]));
  const options: VariantOptions = {};
  for (const [slug, value] of Object.entries(input)) {
    if (isEmpty(value)) continue;
    const axis = bySlug.get(slug);
    if (!axis) return { error: `« ${slug} » n’est pas un axe de variante de cette catégorie` };
    const label = typeof value === 'string' ? canonicalValue(axis, value) : null;
    if (label === null) return { error: `Valeur inconnue « ${String(value)} » pour ${axis.name}` };
    options[slug] = label;
  }
  return { options };
}

/**
 * Attribut → clé de l'ancienne fiche codée en dur (encore celle des fiches d'appareils MobileAPI) :
 * sert à préremplir la fiche technique et à garder le DTO du site rétrocompatible.
 */
export const LEGACY_SPEC_KEY_BY_SLUG: Readonly<Record<string, string>> = {
  rayon: 'audience',
  matiere: 'composition',
  entretien: 'care',
  origine: 'origin',
  modele: 'model',
  'taille-ecran': 'screenSize',
  'technologie-ecran': 'screenTech',
  processeur: 'processor',
  'appareil-photo': 'camera',
  systeme: 'os',
  'double-sim': 'dualSim',
  'dans-la-boite': 'inTheBox',
  'carte-graphique': 'graphics',
  connectique: 'ports',
  compatibilite: 'compatibleModels',
  etancheite: 'waterResistance',
  'type-connecteur': 'connector',
  puissance: 'power',
  'sans-fil': 'wireless',
  autonomie: 'battery',
  capacite: 'battery',
};

export interface PublishProblem {
  slug: string;
  name: string;
  message: string;
}

/**
 * Règle 10 : ce qui empêche la publication. Un attribut obligatoire vide dans la fiche technique,
 * ou un axe obligatoire absent d'une variante vendable.
 */
export function publishProblems(
  attributes: readonly EffectiveAttribute[],
  product: { specs: Readonly<Record<string, unknown>>; variants: readonly { options: Readonly<VariantOptions> }[] },
): PublishProblem[] {
  const problems: PublishProblem[] = [];
  for (const attribute of attributes) {
    if (!attribute.required) continue;
    if (attribute.isVariantAxis) {
      if (product.variants.length === 0 || product.variants.some((variant) => !variant.options[attribute.slug])) {
        problems.push({ slug: attribute.slug, name: attribute.name, message: `${attribute.name} : cochez au moins une valeur` });
      }
    } else if (isEmpty(product.specs[attribute.slug])) {
      problems.push({ slug: attribute.slug, name: attribute.name, message: `${attribute.name} est obligatoire` });
    }
  }
  return problems;
}
