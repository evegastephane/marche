import { type AttributeType, slugify, valueCode, valueKey } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export interface AttributeValueData {
  id: string;
  value: string;
  code: string;
  swatch: string | null;
  position: number;
}

export interface AttributeData {
  storeId: string;
  name: string;
  slug: string;
  type: AttributeType;
  unit: string | null;
  isVariantAxis: boolean;
  filterable: boolean;
  position: number;
  values: AttributeValueData[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface ValueInput {
  value: string;
  code?: string | null;
  swatch?: string | null;
}

export class InvalidAttributeError extends ValidationError {
  constructor(message: string, field?: string) {
    super('VALIDATION_FAILED', message, field ? { field } : undefined);
  }
}

/** Un attribut (ou une valeur) déjà utilisé par des produits ne change pas de nature. */
export class AttributeInUseError extends ConflictError {
  constructor(message: string, code: 'ATTRIBUTE_IN_USE' | 'ATTRIBUTE_VALUE_IN_USE' = 'ATTRIBUTE_IN_USE') {
    super(code, message);
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE_PATTERN = /^[A-Z0-9]{1,16}$/;
const SWATCH_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const MAX_ATTRIBUTE_VALUES = 300;

const hasValues = (type: AttributeType) => type === 'SELECT' || type === 'MULTI_SELECT';

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) throw new InvalidAttributeError('Nom d’attribut requis (60 caractères maximum)', 'name');
  return trimmed;
}

function normalizeUnit(unit: string | null | undefined): string | null {
  const trimmed = unit?.trim() ?? '';
  if (trimmed.length > 12) throw new InvalidAttributeError('Unité : 12 caractères maximum', 'unit');
  return trimmed || null;
}

/** Règle 8 (nombre ⇒ unité) et axe ⇒ liste : les mêmes contraintes que la base. */
function assertShape(type: AttributeType, unit: string | null, isVariantAxis: boolean): void {
  if (type === 'NUMBER' && !unit) throw new InvalidAttributeError('Un attribut nombre a toujours une unité (W, mAh, h…)', 'unit');
  if (isVariantAxis && type !== 'SELECT') {
    throw new InvalidAttributeError('Un axe de variante est une liste à un choix (couleur, stockage…)', 'isVariantAxis');
  }
}

function normalizeValue(input: ValueInput, id: string, position: number): AttributeValueData {
  const value = input.value.trim().replace(/\s+/g, ' ');
  if (!value || value.length > 80) throw new InvalidAttributeError('Valeur requise (80 caractères maximum)', 'values');
  const code = (input.code?.trim().toUpperCase() || valueCode(value)).replace(/\s+/g, '');
  if (!CODE_PATTERN.test(code)) {
    throw new InvalidAttributeError(`Code SKU « ${code} » : lettres majuscules et chiffres, 16 au plus`, 'values');
  }
  const swatch = input.swatch?.trim() || null;
  if (swatch && !SWATCH_PATTERN.test(swatch)) throw new InvalidAttributeError('Pastille au format #RRGGBB', 'values');
  return { id, value, code, swatch, position };
}

/**
 * Attribut d'une fiche produit, défini par la boutique. Son slug est la clé des specs et des options
 * de variantes : il ne change jamais. Son type et son rôle d'axe se figent dès qu'il sert.
 */
export class Attribute extends AggregateRoot {
  private constructor(
    id: string,
    private data: AttributeData,
  ) {
    super(id);
  }

  static create(
    storeId: string,
    input: {
      name: string;
      slug?: string | null;
      type: AttributeType;
      unit?: string | null;
      isVariantAxis?: boolean;
      filterable?: boolean;
      position?: number;
      values?: ValueInput[];
    },
    now: Date,
    id: string = newId(),
  ): Attribute {
    const name = normalizeName(input.name);
    const slug = input.slug?.trim().toLowerCase() || slugify(name);
    if (!SLUG_PATTERN.test(slug) || slug.length > 60) throw new InvalidAttributeError(`Identifiant invalide : « ${slug} »`, 'slug');
    const unit = normalizeUnit(input.unit);
    const isVariantAxis = input.isVariantAxis ?? false;
    assertShape(input.type, unit, isVariantAxis);
    const attribute = new Attribute(id, {
      storeId,
      name,
      slug,
      type: input.type,
      unit,
      isVariantAxis,
      filterable: input.filterable ?? isVariantAxis,
      position: input.position ?? 0,
      values: [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    for (const value of input.values ?? []) attribute.pushValue(value);
    attribute.record(createEvent('catalog.attribute.created', storeId, id, { slug }, now));
    return attribute;
  }

  static reconstitute(id: string, data: AttributeData): Attribute {
    return new Attribute(id, { ...data, values: data.values.map((value) => ({ ...value })) });
  }

  get slug(): string {
    return this.data.slug;
  }

  get type(): AttributeType {
    return this.data.type;
  }

  get isVariantAxis(): boolean {
    return this.data.isVariantAxis;
  }

  get isArchived(): boolean {
    return this.data.archivedAt !== null;
  }

  snapshot(): Readonly<AttributeData> {
    return { ...this.data, values: this.data.values.map((value) => ({ ...value })) };
  }

  /** Nom, unité, filtre, ordre ; type et rôle d'axe seulement tant que l'attribut ne sert à aucun produit. */
  update(
    patch: { name?: string; unit?: string | null; filterable?: boolean; position?: number; type?: AttributeType; isVariantAxis?: boolean },
    inUse: boolean,
    now: Date,
  ): void {
    const type = patch.type ?? this.data.type;
    const isVariantAxis = patch.isVariantAxis ?? this.data.isVariantAxis;
    if (inUse && (type !== this.data.type || isVariantAxis !== this.data.isVariantAxis)) {
      throw new AttributeInUseError('Cet attribut sert déjà à des produits : son type et son rôle d’axe ne changent plus');
    }
    const unit = patch.unit !== undefined ? normalizeUnit(patch.unit) : this.data.unit;
    assertShape(type, unit, isVariantAxis);
    this.data = {
      ...this.data,
      type,
      unit,
      isVariantAxis,
      ...(patch.name !== undefined ? { name: normalizeName(patch.name) } : {}),
      ...(patch.filterable !== undefined ? { filterable: patch.filterable } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      // Un attribut devenu texte, nombre ou oui/non n'a plus de liste de valeurs.
      values: hasValues(type) ? this.data.values : [],
      updatedAt: now,
    };
    this.touch(now);
  }

  addValue(input: ValueInput, now: Date): AttributeValueData {
    const value = this.pushValue(input);
    this.data = { ...this.data, updatedAt: now };
    this.touch(now);
    return value;
  }

  private pushValue(input: ValueInput): AttributeValueData {
    if (!hasValues(this.data.type)) throw new InvalidAttributeError('Seules les listes ont des valeurs proposées', 'values');
    if (this.data.values.length >= MAX_ATTRIBUTE_VALUES) {
      throw new InvalidAttributeError(`${MAX_ATTRIBUTE_VALUES} valeurs au maximum par attribut`, 'values');
    }
    const value = normalizeValue(input, newId(), this.data.values.length);
    if (this.data.values.some((existing) => valueKey(existing.value) === valueKey(value.value))) {
      throw new InvalidAttributeError(`La valeur « ${value.value} » existe déjà`, 'values');
    }
    this.data = { ...this.data, values: [...this.data.values, value] };
    return value;
  }

  /** Renvoie l'ancien libellé si la valeur est renommée (les produits qui l'utilisent sont mis à jour). */
  updateValue(valueId: string, patch: Partial<ValueInput>, now: Date): { renamedFrom: string | null; value: AttributeValueData } {
    const current = this.data.values.find((value) => value.id === valueId);
    if (!current) throw new NotFoundError('Valeur', valueId);
    const next = normalizeValue(
      {
        value: patch.value ?? current.value,
        code: patch.code === undefined ? current.code : patch.code,
        swatch: patch.swatch === undefined ? current.swatch : patch.swatch,
      },
      current.id,
      current.position,
    );
    const renamed = next.value !== current.value;
    if (renamed && this.data.values.some((value) => value.id !== valueId && valueKey(value.value) === valueKey(next.value))) {
      throw new InvalidAttributeError(`La valeur « ${next.value} » existe déjà`, 'values');
    }
    this.data = { ...this.data, values: this.data.values.map((value) => (value.id === valueId ? next : value)), updatedAt: now };
    this.touch(now);
    return { renamedFrom: renamed ? current.value : null, value: next };
  }

  /** Une valeur portée par un produit ou une variante ne se supprime pas. */
  removeValue(valueId: string, inUse: boolean, now: Date): AttributeValueData {
    const current = this.data.values.find((value) => value.id === valueId);
    if (!current) throw new NotFoundError('Valeur', valueId);
    if (inUse) {
      throw new AttributeInUseError(`« ${current.value} » est utilisée par des produits : elle ne peut pas être supprimée`, 'ATTRIBUTE_VALUE_IN_USE');
    }
    this.data = {
      ...this.data,
      values: this.data.values.filter((value) => value.id !== valueId).map((value, position) => ({ ...value, position })),
      updatedAt: now,
    };
    this.touch(now);
    return current;
  }

  reorderValues(valueIds: readonly string[], now: Date): void {
    const known = new Set(this.data.values.map((value) => value.id));
    if (valueIds.length !== known.size || !valueIds.every((id) => known.has(id))) {
      throw new InvalidAttributeError('L’ordre doit citer chaque valeur une fois', 'values');
    }
    const byId = new Map(this.data.values.map((value) => [value.id, value]));
    this.data = {
      ...this.data,
      values: valueIds.map((id, position) => ({ ...(byId.get(id) as AttributeValueData), position })),
      updatedAt: now,
    };
    this.touch(now);
  }

  archive(now: Date): void {
    if (this.isArchived) return;
    this.data = { ...this.data, archivedAt: now, updatedAt: now };
    this.touch(now);
  }

  restore(now: Date): void {
    if (!this.isArchived) return;
    this.data = { ...this.data, archivedAt: null, updatedAt: now };
    this.touch(now);
  }

  /** Un seul événement par modification : le site revalide ses filtres et fiches. */
  private touch(now: Date): void {
    this.record(createEvent('catalog.attribute.updated', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }
}
