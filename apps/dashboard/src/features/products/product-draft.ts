import {
  createProductSchema,
  type CreateProductInput,
  type Currency,
  MAX_PRODUCT_OPTIONS,
  type MediaDto,
  type ProductDto,
  updateProductSchema,
  type UpdateProductInput,
} from '@marche/contracts';
import { amountToInput, parseAmount } from '@/shared/lib/format';

export interface OptionDraft {
  key: string;
  name: string;
  values: string[];
}

export interface VariantDraft {
  key: string;
  id?: string;
  optionValues: string[];
  sku: string;
  skuTouched: boolean;
  price: string;
  compareAt: string;
  quantity: string;
  /** Stock disponible d'une variante existante (lecture seule ici). */
  available: number | null;
}

export interface ProductDraft {
  title: string;
  description: string;
  brandId: string;
  hasOptions: boolean;
  options: OptionDraft[];
  variants: VariantDraft[];
  /** Photos dans l'ordre d'affichage : la première est la photo principale. */
  media: MediaDto[];
  publish: boolean;
}

let counter = 0;
export const newKey = () => `k${++counter}`;

const comboKey = (values: string[]) => values.join('\u0001');

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

export function emptyDraft(): ProductDraft {
  return {
    title: '',
    description: '',
    brandId: '',
    hasOptions: false,
    options: [{ key: newKey(), name: 'Taille', values: [] }],
    variants: [
      { key: newKey(), optionValues: [], sku: '', skuTouched: false, price: '', compareAt: '', quantity: '', available: null },
    ],
    media: [],
    publish: true,
  };
}

export function draftFromProduct(product: ProductDto, currency: Currency): ProductDraft {
  const variants = product.variants.filter((v) => !v.archived);
  return {
    title: product.title,
    description: product.description ?? '',
    brandId: product.brand?.id ?? '',
    hasOptions: product.options.length > 0,
    options:
      product.options.length > 0
        ? product.options.map((o) => ({ key: newKey(), name: o.name, values: [...o.values] }))
        : [{ key: newKey(), name: 'Taille', values: [] }],
    variants: variants.map((v) => ({
      key: newKey(),
      id: v.id,
      optionValues: v.optionValues,
      sku: v.sku,
      skuTouched: true,
      price: amountToInput(v.priceAmount, currency),
      compareAt: v.compareAtAmount === null ? '' : amountToInput(v.compareAtAmount, currency),
      quantity: '',
      available: v.inventory?.available ?? null,
    })),
    media: product.media,
    publish: product.status === 'ACTIVE',
  };
}

/** Produit cartésien des valeurs d'options ; les variantes existantes sont reprises telles quelles. */
export function regenerateVariants(draft: ProductDraft): VariantDraft[] {
  const template = draft.variants[0];
  if (!draft.hasOptions) {
    const single = draft.variants.find((v) => v.optionValues.length === 0) ?? template;
    return [
      single
        ? { ...single, optionValues: [] }
        : { key: newKey(), optionValues: [], sku: '', skuTouched: false, price: '', compareAt: '', quantity: '', available: null },
    ];
  }
  const options = draft.options.filter((o) => o.name.trim() && o.values.length > 0).slice(0, MAX_PRODUCT_OPTIONS);
  if (options.length === 0) return draft.variants.slice(0, 1);
  const combos = options.reduce<string[][]>(
    (acc, option) => acc.flatMap((prefix) => option.values.map((value) => [...prefix, value])),
    [[]],
  );
  const existing = new Map(draft.variants.map((v) => [comboKey(v.optionValues), v]));
  return combos.map((values) => {
    const found = existing.get(comboKey(values));
    if (found) return found;
    return {
      key: newKey(),
      optionValues: values,
      sku: suggestSku(draft.title, values),
      skuTouched: false,
      price: template?.price ?? '',
      compareAt: '',
      quantity: template && !template.id ? template.quantity : '',
      available: null,
    };
  });
}

export type DraftErrors = Record<string, string>;

/** Brouillon → contrat de l'API, avec les erreurs de saisie rattachées à leur champ. */
export function draftToInput(
  draft: ProductDraft,
  currency: Currency,
  existing?: ProductDto,
): { input: CreateProductInput | UpdateProductInput; errors: null } | { input: null; errors: DraftErrors } {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = 'Donnez un nom à l’article.';

  const options = draft.hasOptions ? draft.options.filter((o) => o.name.trim() || o.values.length > 0) : [];
  options.forEach((o, i) => {
    if (!o.name.trim()) errors[`options.${i}.name`] = 'Nommez l’option (Taille, Couleur…).';
    if (o.values.length === 0) errors[`options.${i}.values`] = 'Ajoutez au moins une valeur.';
  });
  if (draft.hasOptions && options.length === 0) errors.options = 'Ajoutez une option, ou décochez les déclinaisons.';

  const seen = new Map<string, number>();
  const variants = draft.variants.map((v, i) => {
    const price = parseAmount(v.price, currency);
    const compareAt = v.compareAt.trim() ? parseAmount(v.compareAt, currency) : null;
    const quantity = v.quantity.trim() === '' ? 0 : Number(v.quantity);
    if (price === null) errors[`variants.${i}.price`] = 'Prix invalide.';
    if (v.compareAt.trim() && compareAt === null) errors[`variants.${i}.compareAt`] = 'Prix invalide.';
    if (compareAt !== null && price !== null && compareAt <= price) {
      errors[`variants.${i}.compareAt`] = 'Doit être supérieur au prix.';
    }
    if (!v.id && (!Number.isInteger(quantity) || quantity < 0)) errors[`variants.${i}.quantity`] = 'Quantité entière, 0 ou plus.';
    const sku = v.sku.trim();
    if (!sku) errors[`variants.${i}.sku`] = 'SKU requis.';
    else if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku)) errors[`variants.${i}.sku`] = 'Lettres, chiffres, points et tirets.';
    else if (seen.has(sku.toUpperCase())) errors[`variants.${i}.sku`] = 'Déjà utilisé plus haut.';
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

  if (Object.keys(errors).length > 0) return { input: null, errors };

  const base = {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    brandId: draft.brandId || null,
    options: options.map((o) => ({ name: o.name.trim(), values: o.values })),
    variants,
    mediaIds: draft.media.map((m) => m.id),
  };
  const parsed = existing
    ? updateProductSchema.safeParse({ ...base, version: existing.version })
    : createProductSchema.safeParse(base);
  if (!parsed.success) {
    return {
      input: null,
      errors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])),
    };
  }
  return { input: parsed.data, errors: null };
}
