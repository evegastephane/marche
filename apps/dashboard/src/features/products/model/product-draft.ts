import {
  type AttributeValueInput,
  canonicalValue,
  type CategoryAttributeDto,
  combinationKey,
  createProductSchema,
  type CreateProductInput,
  type Currency,
  dedupeSku,
  type DeviceModelDto,
  generateCombinations,
  LEGACY_SPEC_KEY_BY_SLUG,
  type MediaDto,
  modelCode,
  type ProductAccessoryDto,
  type ProductDto,
  type ProductSpecs,
  type PublishProblem,
  publishProblems,
  serialSchema,
  type SpecValue,
  suggestSku,
  type UnitInput,
  updateProductSchema,
  type UpdateProductInput,
  type VariantOptions,
  variantTitle,
} from '@marche/contracts';
import { amountToInput, parseAmount } from '@/shared/lib/format';

/**
 * Brouillon du formulaire produit, piloté par la catégorie : ses attributs décident de la fiche
 * technique (attributs simples) et des variantes (axes). Fonctions pures, sans React.
 */

/** Valeur de fiche en cours de saisie : les nombres restent du texte (« 6,1 ») jusqu'à l'envoi. */
export type SpecDraft = string | boolean | string[];

export interface VariantDraft {
  key: string;
  id?: string;
  options: VariantOptions;
  sku: string;
  skuTouched: boolean;
  price: string;
  compareAt: string;
  cost: string;
  /** Stock initial d'une nouvelle variante (hors suivi à l'unité). */
  quantity: string;
  /** IMEI ou numéros de série d'une nouvelle variante suivie à l'unité, un par ligne. */
  serials: string;
  /** Stock disponible d'une variante existante (lecture seule). */
  available: number | null;
}

export interface ProductDraft {
  title: string;
  description: string;
  brandId: string;
  categoryId: string;
  /** Code modèle (« sku parent ») : préfixe des SKU proposés. */
  reference: string;
  /** Référence écrite à la main : le nom ne la recalcule plus. */
  referenceTouched: boolean;
  warranty: string;
  specs: Record<string, SpecDraft>;
  /** Valeurs cochées de chaque axe (slug → valeurs). */
  axes: Record<string, string[]>;
  variants: VariantDraft[];
  /** Combinaisons que la boutique ne propose pas (clés de combinaison). */
  excluded: string[];
  /** Photos dans l'ordre d'affichage : la première est la photo principale. */
  media: MediaDto[];
  /** Photo → couleur : la galerie du site suit la couleur choisie. */
  mediaOptionValues: Record<string, string>;
  accessories: ProductAccessoryDto[];
  publish: boolean;
}

export type DraftErrors = Record<string, string>;
export type Attributes = readonly CategoryAttributeDto[];

let counter = 0;
export const newKey = () => `k${++counter}`;

const blankVariant = (): VariantDraft => ({
  key: newKey(),
  options: {},
  sku: '',
  skuTouched: false,
  price: '',
  compareAt: '',
  cost: '',
  quantity: '',
  serials: '',
  available: null,
});

export const axesOf = (attributes: Attributes) => attributes.filter((attribute) => attribute.isVariantAxis);
export const specAttributesOf = (attributes: Attributes) => attributes.filter((attribute) => !attribute.isVariantAxis);

/** Axe des couleurs (celui qui porte des pastilles) : la galerie du site le suit. */
export function colorAxis(attributes: Attributes): CategoryAttributeDto | undefined {
  const axes = axesOf(attributes);
  return axes.find((axis) => axis.slug === 'couleur') ?? axes.find((axis) => axis.values.some((value) => value.swatch));
}

export function swatchOf(attribute: CategoryAttributeDto | undefined, value: string): string | null {
  return attribute?.values.find((candidate) => candidate.value === value)?.swatch ?? null;
}

/** Axes dont au moins une valeur est cochée ; valeurs dans l'ordre de l'attribut. */
export function activeAxes(draft: ProductDraft, attributes: Attributes): { slug: string; name: string; values: string[] }[] {
  return axesOf(attributes).flatMap((axis) => {
    const picked = draft.axes[axis.slug] ?? [];
    const known = axis.values.map((value) => value.value);
    const values = [...known.filter((value) => picked.includes(value)), ...picked.filter((value) => !known.includes(value))];
    return values.length > 0 ? [{ slug: axis.slug, name: axis.name, values }] : [];
  });
}

export function emptyDraft(categoryId = ''): ProductDraft {
  return {
    title: '',
    description: '',
    brandId: '',
    categoryId,
    reference: '',
    referenceTouched: false,
    warranty: '',
    specs: {},
    axes: {},
    variants: [blankVariant()],
    excluded: [],
    media: [],
    mediaOptionValues: {},
    accessories: [],
    publish: true,
  };
}

/** Garantie par défaut de la boutique, préremplie sur un nouveau produit. */
export function withDefaultWarranty(draft: ProductDraft, months: number | null): ProductDraft {
  return months === null || draft.warranty ? draft : { ...draft, warranty: String(months) };
}

const specToDraft = (value: SpecValue): SpecDraft => (typeof value === 'number' ? String(value).replace('.', ',') : value);

export function draftFromProduct(product: ProductDto, currency: Currency): ProductDraft {
  const variants = product.variants.filter((variant) => !variant.archived);
  const axes: Record<string, string[]> = {};
  for (const variant of variants) {
    for (const [slug, value] of Object.entries(variant.options)) {
      const values = (axes[slug] ??= []);
      if (!values.includes(value)) values.push(value);
    }
  }
  const offered = new Set(variants.map((variant) => combinationKey(variant.options)));
  const excluded =
    Object.keys(axes).length > 0
      ? generateCombinations(Object.entries(axes).map(([slug, values]) => ({ slug, values })))
          .map(combinationKey)
          .filter((key) => !offered.has(key))
      : [];
  return {
    title: product.title,
    description: product.description ?? '',
    brandId: product.brand?.id ?? '',
    categoryId: product.category?.id ?? '',
    reference: product.reference ?? '',
    referenceTouched: product.reference !== null,
    warranty: product.warrantyMonths === null ? '' : String(product.warrantyMonths),
    specs: Object.fromEntries(Object.entries(product.specs).map(([slug, value]) => [slug, specToDraft(value)])),
    axes,
    variants: variants.map((variant) => ({
      key: newKey(),
      id: variant.id,
      options: variant.options,
      sku: variant.sku,
      skuTouched: true,
      price: amountToInput(variant.priceAmount, currency),
      compareAt: variant.compareAtAmount === null ? '' : amountToInput(variant.compareAtAmount, currency),
      cost: variant.costAmount === null ? '' : amountToInput(variant.costAmount, currency),
      quantity: '',
      serials: '',
      available: variant.inventory?.available ?? null,
    })),
    excluded,
    media: product.media,
    mediaOptionValues: { ...product.mediaOptionValues },
    accessories: product.accessories,
    publish: product.status === 'ACTIVE',
  };
}

/** SKU proposés (règle 5) pour les variantes dont le SKU n'a pas été retouché, sans doublon. */
export function withSuggestedSkus(draft: ProductDraft, attributes: Attributes): ProductDraft {
  const axes = axesOf(attributes);
  const used = new Set(draft.variants.filter((variant) => variant.skuTouched).map((variant) => variant.sku.toUpperCase()));
  return {
    ...draft,
    variants: draft.variants.map((variant) => {
      if (variant.skuTouched) return variant;
      const sku = dedupeSku(suggestSku(draft.reference, variant.options, axes), (candidate) => used.has(candidate));
      used.add(sku);
      return { ...variant, sku };
    }),
  };
}

/** Nom saisi : la référence suit tant qu'elle n'a pas été écrite à la main, puis les SKU. */
export function withTitle(draft: ProductDraft, title: string, attributes: Attributes): ProductDraft {
  const reference = draft.referenceTouched ? draft.reference : title.trim() ? modelCode(title) : '';
  return withSuggestedSkus({ ...draft, title, reference }, attributes);
}

/**
 * Variantes = combinaisons des valeurs cochées, moins les combinaisons retirées. Une variante
 * existante est reprise telle quelle (son historique suit) ; une nouvelle copie prix et prix d'achat.
 */
export function regenerateVariants(draft: ProductDraft, attributes: Attributes): ProductDraft {
  const axes = activeAxes(draft, attributes);
  const template = draft.variants[0];
  let variants: VariantDraft[];
  if (axes.length === 0) {
    const single = draft.variants.find((variant) => Object.keys(variant.options).length === 0) ?? template;
    variants = [single ? { ...single, options: {} } : blankVariant()];
  } else {
    const excluded = new Set(draft.excluded);
    const existing = new Map(draft.variants.map((variant) => [combinationKey(variant.options), variant]));
    variants = generateCombinations(axes)
      .filter((options) => !excluded.has(combinationKey(options)))
      .map(
        (options) =>
          existing.get(combinationKey(options)) ?? {
            ...blankVariant(),
            options,
            price: template?.price ?? '',
            cost: template?.cost ?? '',
          },
      );
  }
  return withSuggestedSkus({ ...draft, variants }, attributes);
}

export function variantLabel(variant: Pick<VariantDraft, 'options'>, attributes: Attributes): string {
  return variantTitle(
    variant.options,
    axesOf(attributes).map((axis) => axis.slug),
  );
}

/** Nombre saisi à la française (« 6,1 ») ; null si ce n'en est pas un. */
function parseDecimal(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Fiche technique de la catégorie : champs vides retirés, nombres convertis, erreurs par attribut. */
function specsToInput(draft: ProductDraft, attributes: Attributes, errors: DraftErrors): ProductSpecs {
  const specs: ProductSpecs = {};
  for (const attribute of specAttributesOf(attributes)) {
    const value = draft.specs[attribute.slug];
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    if (attribute.type === 'NUMBER') {
      const number = typeof value === 'string' ? parseDecimal(value) : null;
      if (number === null) errors[`specs.${attribute.slug}`] = 'Nombre attendu (ex. 6,1).';
      else specs[attribute.slug] = number;
    } else if (attribute.type === 'BOOLEAN') {
      if (typeof value === 'boolean') specs[attribute.slug] = value;
    } else if (attribute.type === 'MULTI_SELECT') {
      if (Array.isArray(value)) specs[attribute.slug] = value;
    } else if (typeof value === 'string' && value.trim()) {
      specs[attribute.slug] = value.trim();
    }
  }
  return specs;
}

/** IMEI saisis (un par ligne, ou séparés par des espaces) : normalisés, erreurs signalées. */
export function parseSerials(text: string): { units: UnitInput[]; error: string | null } {
  const lines = text
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const units: UnitInput[] = [];
  for (const line of lines) {
    const parsed = serialSchema.safeParse(line);
    if (!parsed.success) return { units, error: `« ${line} » n’est pas un IMEI ou un numéro de série.` };
    if (units.some((unit) => unit.serial === parsed.data)) return { units, error: `${parsed.data} figure deux fois.` };
    units.push({ serial: parsed.data });
  }
  return { units, error: null };
}

/** Ce qui empêche la mise en vente (règle 10), calculé comme le fera l'API. */
export function draftPublishProblems(draft: ProductDraft, attributes: Attributes): PublishProblem[] {
  return publishProblems(
    attributes.map((attribute) => ({ ...attribute, sourceCategoryId: attribute.source.id })),
    { specs: draft.specs, variants: draft.variants },
  );
}

const VARIANT_FIELDS: Record<string, string> = {
  price: 'Prix',
  compareAt: 'Prix barré',
  costAmount: 'Prix d’achat',
  cost: 'Prix d’achat',
  sku: 'SKU',
  quantity: 'Stock',
  serials: 'IMEI',
  units: 'IMEI',
};

/** Nom lisible de chaque champ en erreur (« Nom », « Prix (256 Go / Noir) »), pour le message de synthèse. */
export function errorLabels(draft: ProductDraft, attributes: Attributes, errors: DraftErrors): string[] {
  const names = new Map(attributes.map((attribute) => [attribute.slug, attribute.name]));
  const labels = Object.keys(errors).map((key) => {
    const [head, index, field] = key.split('.');
    if (head === 'title') return 'Nom';
    if (head === 'categoryId') return 'Catégorie';
    if (head === 'reference') return 'Référence';
    if (head === 'warrantyMonths') return 'Garantie';
    if (head === 'description') return 'Description';
    if (head === 'specs' || head === 'axes') return names.get(index ?? '') ?? 'Fiche technique';
    if (head === 'variants' && index !== undefined) {
      const variant = draft.variants[Number(index)];
      const name = VARIANT_FIELDS[field ?? ''] ?? 'Variante';
      return variant && Object.keys(variant.options).length > 0 ? `${name} (${variantLabel(variant, attributes)})` : name;
    }
    if (head === 'variants') return 'Variantes';
    return key;
  });
  return [...new Set(labels)];
}

/** Brouillon → contrat de l'API, avec les erreurs de saisie rattachées à leur champ. */
export function draftToInput(
  draft: ProductDraft,
  context: { attributes: Attributes; tracksUnits: boolean; currency: Currency; existing?: ProductDto },
): { input: CreateProductInput | UpdateProductInput; errors: null } | { input: null; errors: DraftErrors } {
  const { attributes, tracksUnits, currency, existing } = context;
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = 'Donnez un nom au produit.';
  if (!draft.categoryId) errors.categoryId = 'Choisissez une catégorie.';
  if (draft.variants.length === 0) errors.variants = 'Proposez au moins une combinaison.';

  const warranty = draft.warranty.trim() === '' ? null : Number(draft.warranty);
  if (warranty !== null && (!Number.isInteger(warranty) || warranty < 0 || warranty > 120)) {
    errors.warrantyMonths = 'Nombre de mois entier, de 0 à 120.';
  }

  const seen = new Set<string>();
  const serialsSeen = new Set<string>();
  const variants = draft.variants.map((variant, i) => {
    const price = parseAmount(variant.price, currency);
    const compareAt = variant.compareAt.trim() ? parseAmount(variant.compareAt, currency) : null;
    const cost = variant.cost.trim() ? parseAmount(variant.cost, currency) : null;
    if (price === null) errors[`variants.${i}.price`] = 'Prix invalide.';
    if (variant.compareAt.trim() && compareAt === null) errors[`variants.${i}.compareAt`] = 'Prix invalide.';
    if (compareAt !== null && price !== null && compareAt <= price) errors[`variants.${i}.compareAt`] = 'Doit dépasser le prix.';
    if (variant.cost.trim() && cost === null) errors[`variants.${i}.cost`] = 'Prix invalide.';

    const sku = variant.sku.trim().toUpperCase();
    if (!sku) errors[`variants.${i}.sku`] = 'SKU requis.';
    else if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) errors[`variants.${i}.sku`] = 'Lettres, chiffres, points et tirets.';
    else if (seen.has(sku)) errors[`variants.${i}.sku`] = 'Déjà utilisé plus haut.';
    seen.add(sku);

    let stock: { initialQuantity: number } | { units: UnitInput[] } | Record<string, never> = {};
    if (!variant.id && tracksUnits) {
      const { units, error } = parseSerials(variant.serials);
      const repeated = units.find((unit) => serialsSeen.has(unit.serial));
      if (error) errors[`variants.${i}.serials`] = error;
      else if (repeated) errors[`variants.${i}.serials`] = `${repeated.serial} est déjà saisi sur une autre variante.`;
      for (const unit of units) serialsSeen.add(unit.serial);
      stock = { units };
    } else if (!variant.id) {
      const quantity = variant.quantity.trim() === '' ? 0 : Number(variant.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) errors[`variants.${i}.quantity`] = 'Quantité entière, 0 ou plus.';
      stock = { initialQuantity: quantity };
    }
    return {
      ...(variant.id && { id: variant.id }),
      sku,
      options: variant.options,
      priceAmount: price ?? 0,
      compareAtAmount: compareAt,
      costAmount: cost,
      trackInventory: true,
      ...stock,
    };
  });

  const specs = specsToInput(draft, attributes, errors);
  if (Object.keys(errors).length > 0) return { input: null, errors };

  const color = colorAxis(attributes);
  const colors = new Set(color ? (draft.axes[color.slug] ?? []) : []);
  const mediaIds = draft.media.map((media) => media.id);
  const base = {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    brandId: draft.brandId || null,
    categoryId: draft.categoryId,
    reference: draft.reference.trim() || null,
    warrantyMonths: warranty,
    specs,
    variants,
    mediaIds,
    mediaOptionValues: Object.fromEntries(
      Object.entries(draft.mediaOptionValues).filter(([id, value]) => mediaIds.includes(id) && colors.has(value)),
    ),
    accessoryIds: draft.accessories.map((accessory) => accessory.id),
  };
  const parsed = existing
    ? updateProductSchema.safeParse({ ...base, version: existing.version })
    : createProductSchema.safeParse(base);
  if (!parsed.success) {
    return { input: null, errors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])) };
  }
  return { input: parsed.data, errors: null };
}

// ───────────── Fiche d'appareil (catalogue MobileAPI) ─────────────

const DEVICE_AXES = { storage: 'stockage' } as const;

/** Valeur de l'ancienne fiche mise au format d'un attribut ; null si elle n'y entre pas. */
function deviceSpec(attribute: CategoryAttributeDto, raw: unknown): SpecDraft | null {
  switch (attribute.type) {
    case 'NUMBER':
      return typeof raw === 'number' ? String(raw).replace('.', ',') : null;
    case 'BOOLEAN':
      return typeof raw === 'boolean' ? raw : null;
    case 'SELECT':
      return typeof raw === 'string' ? canonicalValue(attribute, raw) : null;
    case 'MULTI_SELECT': {
      const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
      const labels = items.flatMap((item) => (typeof item === 'string' ? [canonicalValue(attribute, item)] : [])).filter(
        (label): label is string => label !== null,
      );
      return labels.length > 0 ? labels : null;
    }
    case 'TEXT':
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'number') return String(raw);
      if (Array.isArray(raw)) return raw.filter((item) => typeof item === 'string').join(', ');
      return null;
  }
}

/** Valeurs de la fiche (capacités, coloris) que les axes de la catégorie n'ont pas encore. */
export function missingDeviceValues(
  device: DeviceModelDto,
  attributes: Attributes,
): { attributeId: string; values: AttributeValueInput[] }[] {
  const plan: { attributeId: string; values: AttributeValueInput[] }[] = [];
  const storage = axesOf(attributes).find((axis) => axis.slug === DEVICE_AXES.storage);
  if (storage) {
    const values = device.storages.filter((value) => canonicalValue(storage, value) === null).map((value) => ({ value }));
    if (values.length > 0) plan.push({ attributeId: storage.id, values });
  }
  const color = colorAxis(attributes);
  if (color) {
    const values = device.colors
      .filter((c) => canonicalValue(color, c.value) === null)
      .map((c) => ({ value: c.value, swatch: c.hex }));
    if (values.length > 0) plan.push({ attributeId: color.id, values });
  }
  return plan;
}

/**
 * Fiche du catalogue d'appareils appliquée au brouillon : fiche technique (attributs connus de la
 * catégorie), et pour un nouveau produit capacités et coloris cochés. Nom et description déjà écrits sont gardés.
 */
export function applyDevice(
  draft: ProductDraft,
  device: DeviceModelDto,
  attributes: Attributes,
  context: { brandId: string | null; isNew: boolean },
): ProductDraft {
  const specs = { ...draft.specs };
  for (const attribute of specAttributesOf(attributes)) {
    // « battery » est une capacité en mAh sur les fiches d'appareils, pas une autonomie.
    if (attribute.slug === 'autonomie') continue;
    const legacy = LEGACY_SPEC_KEY_BY_SLUG[attribute.slug];
    const raw = legacy ? device.attributes[legacy] : undefined;
    const value = raw === undefined || raw === null ? null : deviceSpec(attribute, raw);
    if (value !== null) specs[attribute.slug] = value;
  }
  const modele = specAttributesOf(attributes).find((attribute) => attribute.slug === 'modele');
  if (modele && !specs.modele) specs.modele = device.name;

  const title = draft.title.trim() ? draft.title : device.name;
  let next: ProductDraft = {
    ...draft,
    title,
    reference: draft.referenceTouched ? draft.reference : modelCode(title),
    brandId: context.brandId ?? draft.brandId,
    description: draft.description.trim() ? draft.description : device.description,
    specs,
  };
  if (context.isNew) {
    const axes = { ...draft.axes };
    const storage = axesOf(attributes).find((axis) => axis.slug === DEVICE_AXES.storage);
    const color = colorAxis(attributes);
    const pick = (axis: CategoryAttributeDto | undefined, values: string[]) => {
      if (!axis || values.length === 0) return;
      axes[axis.slug] = values.flatMap((value) => {
        const label = canonicalValue(axis, value);
        return label ? [label] : [];
      });
    };
    pick(storage, device.storages);
    pick(
      color,
      device.colors.map((c) => c.value),
    );
    next = regenerateVariants({ ...next, axes, excluded: [] }, attributes);
  }
  return withSuggestedSkus(next, attributes);
}
