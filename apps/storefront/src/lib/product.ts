import {
  CONDITION_HINTS,
  type MediaDto,
  type ProductOption,
  type StorefrontProductDto,
  type StorefrontVariantDto,
  swatchFor,
} from '@marche/contracts';

/**
 * Logique d'une fiche produit, commune aux quatre templates (et sans React) :
 * déclinaison choisie, état de chaque valeur, écart de prix, photos de la couleur.
 */

/** Disponible par déclinaison : null = stock non suivi (toujours disponible). */
export type Availability = Record<string, number | null | undefined>;

/** Une valeur est en stock, épuisée, ou non proposée avec le reste de la sélection (sur demande). */
export type ValueState = 'available' | 'soldout' | 'unoffered';

export function isInStock(variant: StorefrontVariantDto, availability: Availability): boolean {
  const available = availability[variant.id];
  return available === null || (available !== undefined && available > 0);
}

export function resolveVariant(variants: StorefrontVariantDto[], selection: string[]): StorefrontVariantDto | null {
  return variants.find((v) => v.optionValues.every((value, i) => value === selection[i])) ?? null;
}

/** Sélection de départ : la première déclinaison en stock, sinon la première tout court. */
export function initialSelection(product: StorefrontProductDto, availability: Availability): string[] {
  const first = product.variants.find((v) => isInStock(v, availability)) ?? product.variants[0];
  return first ? [...first.optionValues] : product.options.map((o) => o.values[0] ?? '');
}

export function valueState(
  product: StorefrontProductDto,
  availability: Availability,
  selection: string[],
  index: number,
  value: string,
): ValueState {
  const candidates = product.variants.filter(
    (v) => v.optionValues[index] === value && v.optionValues.every((val, i) => i === index || val === selection[i]),
  );
  if (candidates.length === 0) return 'unoffered';
  return candidates.some((v) => isInStock(v, availability)) ? 'available' : 'soldout';
}

/** Écart de prix si l'on choisit cette valeur, par rapport à la déclinaison actuelle ; null s'il n'y en a pas. */
export function priceDelta(
  product: StorefrontProductDto,
  selection: string[],
  index: number,
  value: string,
): number | null {
  const current = resolveVariant(product.variants, selection);
  const next = [...selection];
  next[index] = value;
  const candidate = resolveVariant(product.variants, next);
  if (!current || !candidate) return null;
  return candidate.priceAmount - current.priceAmount;
}

export function optionIndex(product: StorefrontProductDto, type: ProductOption['type']): number {
  return product.options.findIndex((o) => o.type === type);
}

/** Photos à montrer : celles de la couleur choisie d'abord, puis les photos sans couleur. */
export function galleryFor(product: StorefrontProductDto, selection: string[]): MediaDto[] {
  const index = optionIndex(product, 'color');
  if (index === -1) return product.images;
  const color = selection[index];
  const tagged = product.images.filter((image) => product.imageOptionValues[image.id] === color);
  if (tagged.length === 0) return product.images;
  const neutral = product.images.filter((image) => !product.imageOptionValues[image.id]);
  return [...tagged, ...neutral];
}

export function swatchOf(option: ProductOption, value: string): string | null {
  return option.type === 'color' ? swatchFor(option, value) : null;
}

export function conditionHint(value: string): string | undefined {
  return CONDITION_HINTS[value];
}

/** Mention de stock lisible ; les dernières pièces sont annoncées. */
export function stockLabel(available: number | null | undefined): string {
  if (available === null) return 'En stock';
  if (available === undefined || available <= 0) return 'Épuisé';
  if (available <= 5) return available === 1 ? 'Dernière pièce' : `Plus que ${available}`;
  return 'En stock';
}

/** Prix le plus bas et le plus haut d'un produit. */
export function priceRange(product: StorefrontProductDto): { min: number; max: number } {
  const prices = product.variants.map((v) => v.priceAmount);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Remise d'un exemplaire de pack (même règle que le serveur : plafonnée au total). */
export function packDiscount(discountType: 'PERCENT' | 'AMOUNT', discountValue: number, total: number): number {
  const raw = discountType === 'PERCENT' ? Math.round((total * discountValue) / 100) : discountValue;
  return Math.max(0, Math.min(raw, total));
}
