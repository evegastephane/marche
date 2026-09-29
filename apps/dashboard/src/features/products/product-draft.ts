import {
  createProductSchema,
  type CreateProductInput,
  type Currency,
  type DeviceModelDto,
  inferOptionType,
  KIND_ATTRIBUTES,
  KINDS,
  MAX_PRODUCT_OPTIONS,
  type MediaDto,
  type OptionType,
  type ProductAccessoryDto,
  type ProductAttributes,
  type ProductDto,
  type ProductKind,
  swatchFor,
  updateProductSchema,
  type UpdateProductInput,
} from '@marche/contracts';
import { amountToInput, parseAmount } from '@/shared/lib/format';

export interface OptionDraft {
  key: string;
  name: string;
  /** Nature de l'option : décide des valeurs proposées et de l'affichage sur le site. */
  type: OptionType;
  values: string[];
  /** Pastille de chaque couleur (valeur → #RRGGBB), pour une option « couleur ». */
  swatches: Record<string, string>;
}

export interface VariantDraft {
  key: string;
  id?: string;
  optionValues: string[];
  sku: string;
  skuTouched: boolean;
  price: string;
  compareAt: string;
  /** Stock initial d'une nouvelle déclinaison. */
  quantity: string;
  /** Stock disponible d'une déclinaison existante (lecture seule). */
  available: number | null;
  /** Stock en main d'une déclinaison existante, point de départ d'un comptage. */
  onHand: number | null;
  /** Comptage saisi dans la grille ('' = inchangé). */
  count: string;
}

/** Valeur d'attribut en cours de saisie : les nombres restent du texte jusqu'à l'envoi. */
export type AttributeDraft = string | boolean | string[];

export interface ProductDraft {
  title: string;
  description: string;
  brandId: string;
  kind: ProductKind | null;
  attributes: Record<string, AttributeDraft>;
  hasOptions: boolean;
  options: OptionDraft[];
  variants: VariantDraft[];
  /** Combinaisons que la boutique ne propose pas (elles ne deviennent pas des déclinaisons). */
  excluded: string[];
  /** Photos dans l'ordre d'affichage : la première est la photo principale. */
  media: MediaDto[];
  /** Photo → couleur : la galerie du site suit la couleur choisie. */
  mediaOptionValues: Record<string, string>;
  accessories: ProductAccessoryDto[];
  publish: boolean;
}

let counter = 0;
export const newKey = () => `k${++counter}`;

export const comboKey = (values: readonly string[]) => values.join('\u0001');

function abbreviate(text: string, length: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.slice(0, length))
    .join('-')
    .toUpperCase();
}

/** SKU proposé : « Boubou brodé », [M, Bleu nuit] → « BOU-BRO-M-BLE-NUI ». */
export function suggestSku(title: string, values: string[]): string {
  const base = abbreviate(title, 3).split('-').slice(0, 3).join('-') || 'ART';
  const suffix = values.map((v) => abbreviate(v, 3)).filter(Boolean);
  return [base, ...suffix].join('-').slice(0, 64);
}

export { inferOptionType } from '@marche/contracts';

const blankVariant = (): VariantDraft => ({
  key: newKey(),
  optionValues: [],
  sku: '',
  skuTouched: false,
  price: '',
  compareAt: '',
  quantity: '',
  available: null,
  onHand: null,
  count: '',
});

/** Options proposées pour une sorte d'article (Taille et Couleur pour un vêtement…). */
export function presetOptions(kind: ProductKind | null): OptionDraft[] {
  if (!kind)
    return [
      { key: newKey(), name: 'Taille', type: 'size', values: [], swatches: {} },
    ];
  return KINDS[kind].options.map((preset) => ({
    key: newKey(),
    name: preset.name,
    type: preset.type,
    values: [...(preset.defaults ?? [])],
    swatches: {},
  }));
}

/**
 * Fiche du catalogue d'appareils appliquée au brouillon : fiche technique, et, pour un nouveau produit,
 * nom, description, capacités et coloris. Ce que le marchand a déjà écrit (nom, description) est gardé.
 */
export function applyDevice(
  draft: ProductDraft,
  device: DeviceModelDto,
  context: {
    brandId: string | null;
    isNew: boolean;
    kinds: readonly ProductKind[];
  },
): ProductDraft {
  const kind =
    context.isNew && context.kinds.includes(device.kind)
      ? device.kind
      : draft.kind;
  const fields = new Set(
    kind ? KIND_ATTRIBUTES[kind].map((field) => field.key) : [],
  );
  const attributes = { ...draft.attributes };
  for (const [key, value] of Object.entries(
    attributesToDraft(device.attributes),
  )) {
    if (fields.has(key)) attributes[key] = value;
  }
  const title = draft.title.trim() ? draft.title : device.name;
  let next: ProductDraft = {
    ...draft,
    kind,
    title,
    brandId: context.brandId ?? draft.brandId,
    description: draft.description.trim()
      ? draft.description
      : device.description,
    attributes,
  };
  if (context.isNew) {
    const base = kind !== draft.kind ? presetOptions(kind) : draft.options;
    let options = [...base];
    const ensure = (type: OptionType, name: string) => {
      if (!options.some((o) => o.type === type))
        options.push({ key: newKey(), name, type, values: [], swatches: {} });
    };
    if (device.storages.length > 0) ensure('storage', 'Stockage');
    if (device.colors.length > 0) ensure('color', 'Couleur');
    options = options.slice(0, MAX_PRODUCT_OPTIONS).map((option) => {
      if (option.type === 'storage' && device.storages.length > 0)
        return { ...option, values: device.storages };
      if (option.type === 'color' && device.colors.length > 0) {
        return {
          ...option,
          values: device.colors.map((c) => c.value),
          swatches: Object.fromEntries(
            device.colors.flatMap((c) => (c.hex ? [[c.value, c.hex]] : [])),
          ),
        };
      }
      return option;
    });
    next = {
      ...next,
      options,
      hasOptions: options.some((o) => o.values.length > 0),
      excluded: [],
    };
    next = { ...next, variants: regenerateVariants(next) };
  }
  return {
    ...next,
    variants: next.variants.map((v) =>
      v.skuTouched ? v : { ...v, sku: suggestSku(title, v.optionValues) },
    ),
  };
}

/** Garantie par défaut de la boutique, préremplie sur un nouvel appareil (si la fiche n'en a pas). */
export function withDefaultWarranty(
  draft: ProductDraft,
  months: number | null,
): ProductDraft {
  if (
    months === null ||
    !draft.kind ||
    draft.attributes.warrantyMonths !== undefined
  )
    return draft;
  if (
    !KIND_ATTRIBUTES[draft.kind].some((field) => field.key === 'warrantyMonths')
  )
    return draft;
  return {
    ...draft,
    attributes: { ...draft.attributes, warrantyMonths: String(months) },
  };
}

export function emptyDraft(kind: ProductKind | null = null): ProductDraft {
  const options = presetOptions(kind);
  return {
    title: '',
    description: '',
    brandId: '',
    kind,
    attributes: {},
    // Déclinaisons d'emblée quand la sorte propose des valeurs (tailles, stockage…).
    hasOptions: kind !== null && options.some((o) => o.values.length > 0),
    options: options.length > 0 ? options : presetOptions(null),
    variants: [blankVariant()],
    excluded: [],
    media: [],
    mediaOptionValues: {},
    accessories: [],
    publish: true,
  };
}

/** Attributs du produit mis en forme pour la saisie (nombres en texte, à la française). */
function attributesToDraft(
  attributes: ProductAttributes,
): Record<string, AttributeDraft> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      typeof value === 'number' ? String(value).replace('.', ',') : value,
    ]),
  );
}

export function draftFromProduct(
  product: ProductDto,
  currency: Currency,
): ProductDraft {
  const variants = product.variants.filter((v) => !v.archived);
  const options: OptionDraft[] = product.options.map((o) => ({
    key: newKey(),
    name: o.name,
    type: o.type ?? inferOptionType(o.name),
    values: [...o.values],
    swatches: { ...(o.swatches ?? {}) },
  }));
  const offered = new Set(variants.map((v) => comboKey(v.optionValues)));
  const excluded =
    options.length > 0
      ? options
          .reduce<string[][]>(
            (acc, option) =>
              acc.flatMap((prefix) => option.values.map((v) => [...prefix, v])),
            [[]],
          )
          .map(comboKey)
          .filter((key) => !offered.has(key))
      : [];
  return {
    title: product.title,
    description: product.description ?? '',
    brandId: product.brand?.id ?? '',
    kind: product.kind,
    attributes: attributesToDraft(product.attributes),
    hasOptions: options.length > 0,
    options: options.length > 0 ? options : presetOptions(product.kind),
    variants: variants.map((v) => ({
      key: newKey(),
      id: v.id,
      optionValues: v.optionValues,
      sku: v.sku,
      skuTouched: true,
      price: amountToInput(v.priceAmount, currency),
      compareAt:
        v.compareAtAmount === null
          ? ''
          : amountToInput(v.compareAtAmount, currency),
      quantity: '',
      available: v.inventory?.available ?? null,
      onHand: v.inventory?.onHand ?? null,
      count: '',
    })),
    excluded,
    media: product.media,
    mediaOptionValues: { ...product.mediaOptionValues },
    accessories: product.accessories,
    publish: product.status === 'ACTIVE',
  };
}

/** Options complètes (nom et valeurs), dans la limite permise. */
export function activeOptions(draft: ProductDraft): OptionDraft[] {
  if (!draft.hasOptions) return [];
  return draft.options
    .filter((o) => o.name.trim() && o.values.length > 0)
    .slice(0, MAX_PRODUCT_OPTIONS);
}

/** Toutes les combinaisons des valeurs d'options, proposées ou non. */
export function allCombinations(draft: ProductDraft): string[][] {
  const options = activeOptions(draft);
  if (options.length === 0) return [];
  return options.reduce<string[][]>(
    (acc, option) =>
      acc.flatMap((prefix) => option.values.map((value) => [...prefix, value])),
    [[]],
  );
}

/** Produit cartésien des valeurs d'options, sans les combinaisons exclues ; l'existant est repris tel quel. */
export function regenerateVariants(draft: ProductDraft): VariantDraft[] {
  const template = draft.variants[0];
  if (!draft.hasOptions) {
    const single =
      draft.variants.find((v) => v.optionValues.length === 0) ?? template;
    return [single ? { ...single, optionValues: [] } : blankVariant()];
  }
  const combos = allCombinations(draft);
  if (combos.length === 0) return draft.variants.slice(0, 1);
  const excluded = new Set(draft.excluded);
  const existing = new Map(
    draft.variants.map((v) => [comboKey(v.optionValues), v]),
  );
  return combos
    .filter((values) => !excluded.has(comboKey(values)))
    .map((values) => {
      const found = existing.get(comboKey(values));
      if (found) return found;
      return {
        ...blankVariant(),
        optionValues: values,
        sku: suggestSku(draft.title, values),
        price: template?.price ?? '',
        quantity: template && !template.id ? template.quantity : '',
      };
    });
}

/** Couleur de l'option « couleur », si le produit en a une. */
export function colorOption(draft: ProductDraft): OptionDraft | undefined {
  return activeOptions(draft).find((o) => o.type === 'color');
}

export function swatchOf(option: OptionDraft, value: string): string | null {
  return swatchFor(option, value);
}

export type DraftErrors = Record<string, string>;

/** Nombre saisi à la française (« 6,1 ») ; null si ce n'en est pas un. */
function parseDecimal(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Fiche technique de la sorte d'article : champs vides retirés, nombres convertis. */
function attributesToInput(
  draft: ProductDraft,
  errors: DraftErrors,
): ProductAttributes {
  if (!draft.kind) return {};
  const attributes: ProductAttributes = {};
  for (const field of KIND_ATTRIBUTES[draft.kind]) {
    const value = draft.attributes[field.key];
    if (
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    )
      continue;
    if (field.type === 'number') {
      const number = typeof value === 'string' ? parseDecimal(value) : null;
      if (number === null)
        errors[`attributes.${field.key}`] = 'Nombre attendu (ex. 6,1).';
      else attributes[field.key] = number;
    } else if (field.type === 'boolean') {
      if (value === true) attributes[field.key] = true;
      else if (value === false) attributes[field.key] = false;
    } else if (field.type === 'tags') {
      if (Array.isArray(value)) attributes[field.key] = value;
    } else if (typeof value === 'string' && value.trim()) {
      attributes[field.key] = value.trim();
    }
  }
  return attributes;
}

/** Comptages saisis dans la grille : les déclinaisons existantes dont le stock a changé. */
export function pendingCounts(
  draft: ProductDraft,
): { variantId: string; onHand: number; expectedOnHand: number }[] {
  return draft.variants.flatMap((v) => {
    if (!v.id || v.onHand === null || v.count.trim() === '') return [];
    const onHand = Number(v.count);
    if (!Number.isInteger(onHand) || onHand < 0 || onHand === v.onHand)
      return [];
    return [{ variantId: v.id, onHand, expectedOnHand: v.onHand }];
  });
}

/** Brouillon → contrat de l'API, avec les erreurs de saisie rattachées à leur champ. */
export function draftToInput(
  draft: ProductDraft,
  currency: Currency,
  existing?: ProductDto,
):
  | { input: CreateProductInput | UpdateProductInput; errors: null }
  | { input: null; errors: DraftErrors } {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = 'Donnez un nom à l’article.';

  const options = draft.hasOptions
    ? draft.options.filter((o) => o.name.trim() || o.values.length > 0)
    : [];
  options.forEach((o, i) => {
    if (!o.name.trim())
      errors[`options.${i}.name`] = 'Nommez l’option (Taille, Couleur…).';
    if (o.values.length === 0)
      errors[`options.${i}.values`] = 'Ajoutez au moins une valeur.';
  });
  if (draft.hasOptions && options.length === 0)
    errors.options = 'Ajoutez une option, ou décochez les déclinaisons.';
  if (draft.hasOptions && draft.variants.length === 0)
    errors.options = 'Proposez au moins une combinaison.';

  const seen = new Map<string, number>();
  const variants = draft.variants.map((v, i) => {
    const price = parseAmount(v.price, currency);
    const compareAt = v.compareAt.trim()
      ? parseAmount(v.compareAt, currency)
      : null;
    const quantity = v.quantity.trim() === '' ? 0 : Number(v.quantity);
    if (price === null) errors[`variants.${i}.price`] = 'Prix invalide.';
    if (v.compareAt.trim() && compareAt === null)
      errors[`variants.${i}.compareAt`] = 'Prix invalide.';
    if (compareAt !== null && price !== null && compareAt <= price) {
      errors[`variants.${i}.compareAt`] = 'Doit être supérieur au prix.';
    }
    if (!v.id && (!Number.isInteger(quantity) || quantity < 0))
      errors[`variants.${i}.quantity`] = 'Quantité entière, 0 ou plus.';
    const sku = v.sku.trim();
    if (!sku) errors[`variants.${i}.sku`] = 'SKU requis.';
    else if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku))
      errors[`variants.${i}.sku`] = 'Lettres, chiffres, points et tirets.';
    else if (seen.has(sku.toUpperCase()))
      errors[`variants.${i}.sku`] = 'Déjà utilisé plus haut.';
    seen.set(sku.toUpperCase(), i);
    return {
      ...(v.id && { id: v.id }),
      sku,
      optionValues: draft.hasOptions ? v.optionValues : [],
      priceAmount: price ?? 0,
      compareAtAmount: compareAt,
      trackInventory: true,
      ...(!v.id && { initialQuantity: quantity }),
    };
  });

  const attributes = attributesToInput(draft, errors);
  if (Object.keys(errors).length > 0) return { input: null, errors };

  const cleanOptions = options.map((o) => {
    const swatches =
      o.type === 'color'
        ? Object.fromEntries(
            Object.entries(o.swatches).filter(([value]) =>
              o.values.includes(value),
            ),
          )
        : {};
    return {
      name: o.name.trim(),
      values: o.values,
      type: o.type,
      ...(Object.keys(swatches).length > 0 && { swatches }),
    };
  });
  const colors = new Set(
    cleanOptions.find((o) => o.type === 'color')?.values ?? [],
  );
  const mediaIds = draft.media.map((m) => m.id);
  const base = {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    brandId: draft.brandId || null,
    kind: draft.kind,
    attributes,
    options: cleanOptions,
    variants,
    mediaIds,
    mediaOptionValues: Object.fromEntries(
      Object.entries(draft.mediaOptionValues).filter(
        ([id, value]) => mediaIds.includes(id) && colors.has(value),
      ),
    ),
    accessoryIds: draft.accessories.map((a) => a.id),
  };
  const parsed = existing
    ? updateProductSchema.safeParse({ ...base, version: existing.version })
    : createProductSchema.safeParse(base);
  if (!parsed.success) {
    return {
      input: null,
      errors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join('.'),
          issue.message,
        ]),
      ),
    };
  }
  return { input: parsed.data, errors: null };
}
