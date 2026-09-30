import {
  combinationKey,
  type EffectiveAttribute,
  MAX_PRODUCT_ACCESSORIES,
  MAX_PRODUCT_MEDIA,
  MAX_PRODUCT_VARIANTS,
  type ProductSpecs,
  type ProductStatus,
  publishProblems,
  type PublishProblem,
  validateSpecs,
  validateVariantOptions,
  valueKey,
  variantTitle,
  type VariantOptions,
} from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { newId } from '../../../shared/domain/id.js';
import { Slug } from '../../../shared/domain/slug.vo.js';
import { InvalidProductError, ProductNotPublishableError } from './catalog.errors.js';
import { ProductVariant, type UnitDraft, type VariantDraft } from './product-variant.entity.js';

/** Ce que la catégorie impose au produit : ses attributs (hérités compris) et le suivi à l'unité. */
export interface CategoryContext {
  categoryId: string;
  attributes: readonly EffectiveAttribute[];
  tracksUnits: boolean;
}

export interface ProductData {
  storeId: string;
  brandId: string | null;
  categoryId: string;
  /** Référence du modèle (« sku parent ») : préfixe des SKU proposés, clé de l'import. */
  reference: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  /** Fiche technique (attributs hors axes de la catégorie). */
  specs: ProductSpecs;
  warrantyMonths: number | null;
  variants: ProductVariant[];
  mediaIds: string[];
  /** Photo → valeur d'axe (une couleur) montrée par la photo. */
  mediaOptionValues: Record<string, string>;
  /** Accessoires choisis à la main, dans l'ordre. */
  accessoryIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface ProductDraft {
  title: string;
  slug: string;
  description?: string | null;
  brandId?: string | null;
  reference?: string | null;
  warrantyMonths?: number | null;
  specs?: Readonly<Record<string, unknown>>;
  variants: VariantDraft[];
  mediaIds: string[];
  mediaOptionValues?: Record<string, string>;
  accessoryIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

/** Variante créée (ou réactivée) : l'inventaire pose son stock initial dans la même transaction. */
export interface NewVariant {
  variantId: string;
  initialQuantity: number;
  /** Suivi à l'unité : unités en stock (le stock initial est leur nombre). */
  units: UnitDraft[];
  tracksUnits: boolean;
  /** Neuf ou d'occasion, d'après l'axe État de la variante. */
  condition: 'NEW' | 'USED';
}

const REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const SERIAL_PATTERN = /^[A-Z0-9-]{3,40}$/;
const CONDITION_AXIS = 'etat';

/** IMEI ou numéro de série normalisé : majuscules, sans espaces. */
export function normalizeSerial(serial: string): string {
  return serial.replace(/[\s.]+/g, '').toUpperCase();
}

/** L'état d'une unité découle de l'axe État : tout autre état que « Neuf » est une occasion. */
export function conditionOf(options: Readonly<VariantOptions>): 'NEW' | 'USED' {
  const state = options[CONDITION_AXIS];
  return state && valueKey(state) !== valueKey('Neuf') ? 'USED' : 'NEW';
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) throw new InvalidProductError('Titre requis (200 caractères maximum)', 'title');
  return trimmed;
}

function normalizeReference(reference: string | null | undefined): string | null {
  const value = reference?.trim().toUpperCase() ?? '';
  if (!value) return null;
  if (!REFERENCE_PATTERN.test(value)) {
    throw new InvalidProductError('Référence : lettres, chiffres, points, tirets et soulignés (32 au plus)', 'reference');
  }
  return value;
}

function normalizeWarranty(months: number | null | undefined): number | null {
  if (months === undefined || months === null) return null;
  if (!Number.isInteger(months) || months < 0 || months > 120) throw new InvalidProductError('Garantie : 0 à 120 mois', 'warrantyMonths');
  return months;
}

function normalizeSpecs(context: CategoryContext | null, specs: Readonly<Record<string, unknown>> | undefined): ProductSpecs {
  if (!context) return {};
  const parsed = validateSpecs(context.attributes, specs ?? {});
  const [slug, message] = Object.entries(parsed.errors)[0] ?? [];
  if (slug) {
    const name = context.attributes.find((attribute) => attribute.slug === slug)?.name ?? slug;
    throw new InvalidProductError(`${name} : ${message}`, `specs.${slug}`);
  }
  return parsed.specs;
}

function normalizeMediaIds(mediaIds: readonly string[]): string[] {
  const unique = [...new Set(mediaIds)];
  if (unique.length > MAX_PRODUCT_MEDIA) throw new InvalidProductError(`${MAX_PRODUCT_MEDIA} images maximum`, 'mediaIds');
  return unique;
}

function normalizeAccessoryIds(productId: string, accessoryIds: readonly string[] | undefined): string[] {
  const unique = [...new Set(accessoryIds ?? [])].filter((id) => id !== productId);
  if (unique.length > MAX_PRODUCT_ACCESSORIES) {
    throw new InvalidProductError(`${MAX_PRODUCT_ACCESSORIES} accessoires maximum`, 'accessoryIds');
  }
  return unique;
}

/** Une photo n'est associée qu'à une valeur d'axe portée par une variante active. */
function normalizeMediaOptionValues(
  tags: Readonly<Record<string, string>> | undefined,
  mediaIds: readonly string[],
  variants: readonly ProductVariant[],
): Record<string, string> {
  const values = new Set(variants.filter((v) => !v.isArchived).flatMap((variant) => Object.values(variant.options)));
  return Object.fromEntries(
    Object.entries(tags ?? {}).filter(([mediaId, value]) => mediaIds.includes(mediaId) && values.has(value)),
  );
}

interface ResolvedDraft {
  draft: VariantDraft;
  options: VariantOptions;
  key: string;
  title: string;
  units: UnitDraft[];
  field: string;
}

/**
 * Règles 3 et 4 : valeurs d'axes valides, mêmes axes pour toutes les variantes, sans axe une seule
 * variante, combinaisons et SKU uniques ; unités (IMEI) uniques, réservées au suivi à l'unité.
 */
function resolveVariants(drafts: readonly VariantDraft[], context: CategoryContext | null): ResolvedDraft[] {
  if (drafts.length === 0) throw new InvalidProductError('Un produit a au moins une variante', 'variants');
  if (drafts.length > MAX_PRODUCT_VARIANTS) throw new InvalidProductError(`${MAX_PRODUCT_VARIANTS} variantes maximum`, 'variants');
  const axes = (context?.attributes ?? []).filter((attribute) => attribute.isVariantAxis);
  const axisOrder = axes.map((axis) => axis.slug);
  const combinations = new Set<string>();
  const skus = new Set<string>();
  const serials = new Set<string>();
  // Axes utilisés par la première variante : toutes les autres doivent avoir les mêmes.
  const used: { axes: string | null } = { axes: null };

  const resolved = drafts.map((draft, index) => {
    const field = `variants.${index}`;
    const result = validateVariantOptions(axes, draft.options);
    if ('error' in result) throw new InvalidProductError(result.error, `${field}.options`);
    const signature = Object.keys(result.options).sort().join('|');
    if (used.axes === null) used.axes = signature;
    else if (used.axes !== signature) {
      throw new InvalidProductError('Chaque variante a une valeur pour chacun des axes utilisés', `${field}.options`);
    }
    const key = combinationKey(result.options);
    const title = variantTitle(result.options, axisOrder);
    if (combinations.has(key)) throw new InvalidProductError(`Combinaison en double : ${title}`, `${field}.options`);
    combinations.add(key);
    const sku = valueKey(draft.sku);
    if (skus.has(sku)) throw new InvalidProductError(`SKU en double : « ${draft.sku} »`, `${field}.sku`);
    skus.add(sku);

    const units = (draft.units ?? []).map((unit, unitIndex) => {
      const serial = normalizeSerial(unit.serial);
      if (!SERIAL_PATTERN.test(serial)) {
        throw new InvalidProductError(`IMEI ou numéro de série invalide : « ${unit.serial} »`, `${field}.units.${unitIndex}`);
      }
      if (serials.has(serial)) throw new InvalidProductError(`IMEI en double : ${serial}`, `${field}.units.${unitIndex}`);
      serials.add(serial);
      const battery = unit.batteryHealth ?? null;
      if (battery !== null && (!Number.isInteger(battery) || battery < 0 || battery > 100)) {
        throw new InvalidProductError('Santé de la batterie : 0 à 100 %', `${field}.units.${unitIndex}`);
      }
      return { serial, batteryHealth: battery, notes: unit.notes?.trim() || null };
    });
    if (context?.tracksUnits) {
      if ((draft.initialQuantity ?? 0) > 0 && units.length === 0) {
        throw new InvalidProductError(
          'Appareil suivi à l’unité : saisissez l’IMEI ou le numéro de série de chaque pièce en stock',
          `${field}.units`,
        );
      }
    } else if (units.length > 0) {
      throw new InvalidProductError('Cette catégorie n’est pas suivie à l’unité (pas d’IMEI)', `${field}.units`);
    }
    return { draft, options: result.options, key, title, units, field };
  });

  if (used.axes === '' && resolved.length > 1) {
    throw new InvalidProductError('Sans axe de variante, un produit n’a qu’une variante', 'variants');
  }
  return resolved;
}

export class Product extends AggregateRoot {
  private constructor(
    id: string,
    private data: ProductData,
    version = 0,
  ) {
    super(id, version);
  }

  static create(
    storeId: string,
    draft: ProductDraft,
    context: CategoryContext,
    now: Date,
    id: string = newId(),
  ): { product: Product; newVariants: NewVariant[] } {
    const resolved = resolveVariants(draft.variants, context);
    const variants = resolved.map((entry, position) =>
      ProductVariant.fromDraft(
        entry.draft,
        { options: entry.options, title: entry.title, position, trackInventory: context.tracksUnits || entry.draft.trackInventory },
        newId(),
        entry.field,
      ),
    );
    const mediaIds = normalizeMediaIds(draft.mediaIds);
    const product = new Product(id, {
      storeId,
      brandId: draft.brandId ?? null,
      categoryId: context.categoryId,
      reference: normalizeReference(draft.reference),
      title: normalizeTitle(draft.title),
      slug: Slug.of(draft.slug).value,
      description: draft.description ?? null,
      status: 'DRAFT',
      specs: normalizeSpecs(context, draft.specs),
      warrantyMonths: normalizeWarranty(draft.warrantyMonths),
      variants,
      mediaIds,
      mediaOptionValues: normalizeMediaOptionValues(draft.mediaOptionValues, mediaIds, variants),
      accessoryIds: normalizeAccessoryIds(id, draft.accessoryIds),
      seoTitle: draft.seoTitle ?? null,
      seoDescription: draft.seoDescription ?? null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    product.record(createEvent('catalog.product.created', storeId, id, { title: product.data.title, slug: product.data.slug }, now));
    return {
      product,
      newVariants: variants.map((variant, index) => Product.newVariant(variant, resolved[index] as ResolvedDraft, context)),
    };
  }

  static reconstitute(id: string, data: ProductData, version: number): Product {
    return new Product(
      id,
      { ...data, variants: [...data.variants], mediaIds: [...data.mediaIds], accessoryIds: [...data.accessoryIds] },
      version,
    );
  }

  private static newVariant(variant: ProductVariant, entry: ResolvedDraft, context: CategoryContext | null): NewVariant {
    const tracksUnits = context?.tracksUnits ?? false;
    return {
      variantId: variant.id,
      initialQuantity: tracksUnits ? entry.units.length : (entry.draft.initialQuantity ?? 0),
      units: entry.units,
      tracksUnits,
      condition: conditionOf(entry.options),
    };
  }

  get storeId(): string {
    return this.data.storeId;
  }

  get slug(): string {
    return this.data.slug;
  }

  get status(): ProductStatus {
    return this.data.status;
  }

  get title(): string {
    return this.data.title;
  }

  get categoryId(): string {
    return this.data.categoryId;
  }

  /** Toutes les variantes, archivées comprises (l'historique des commandes y fait référence). */
  get variants(): readonly ProductVariant[] {
    return this.data.variants;
  }

  get activeVariants(): ProductVariant[] {
    return this.data.variants.filter((variant) => !variant.isArchived);
  }

  snapshot(): Readonly<ProductData> {
    return {
      ...this.data,
      specs: structuredClone(this.data.specs),
      variants: [...this.data.variants],
      mediaIds: [...this.data.mediaIds],
      accessoryIds: [...this.data.accessoryIds],
    };
  }

  /**
   * Mise à jour complète depuis le formulaire. Une variante se retrouve par son id, sinon par sa
   * combinaison : décocher puis recocher une combinaison réactive l'ancienne variante (son historique
   * reste). Les variantes absentes sont archivées, jamais supprimées. Un produit en vente doit rester
   * complet (règle 10).
   */
  update(draft: ProductDraft, context: CategoryContext, now: Date): NewVariant[] {
    const resolved = resolveVariants(draft.variants, context);
    const byId = new Map(this.data.variants.map((variant) => [variant.id, variant]));
    const byKey = new Map(this.data.variants.map((variant) => [combinationKey(variant.options), variant]));
    const kept = new Set<string>();
    const newVariants: NewVariant[] = [];

    const active = resolved.map((entry, position) => {
      let existing: ProductVariant | undefined;
      if (entry.draft.id) {
        existing = byId.get(entry.draft.id);
        if (!existing) throw new InvalidProductError(`Variante inconnue : ${entry.draft.id}`, `${entry.field}.id`);
      } else {
        existing = byKey.get(entry.key);
        if (existing && kept.has(existing.id)) existing = undefined;
      }
      if (existing && kept.has(existing.id)) {
        throw new InvalidProductError('Une variante apparaît deux fois', `${entry.field}.id`);
      }
      const id = existing?.id ?? newId();
      kept.add(id);
      const variant = ProductVariant.fromDraft(
        entry.draft,
        { options: entry.options, title: entry.title, position, trackInventory: context.tracksUnits || entry.draft.trackInventory },
        id,
        entry.field,
      );
      // Nouvelle variante, ou combinaison réactivée : son stock initial est posé par l'inventaire.
      if (!existing || existing.isArchived) newVariants.push(Product.newVariant(variant, entry, context));
      else if (entry.units.length > 0) {
        throw new InvalidProductError('Les unités d’une variante existante s’ajoutent depuis le stock', `${entry.field}.units`);
      }
      return variant;
    });
    const archived = this.data.variants.filter((variant) => !kept.has(variant.id)).map((variant) => variant.archived(now));

    const previousSlug = this.data.slug;
    const mediaIds = normalizeMediaIds(draft.mediaIds);
    const variants = [...active, ...archived];
    this.data = {
      ...this.data,
      brandId: draft.brandId ?? null,
      categoryId: context.categoryId,
      reference: normalizeReference(draft.reference),
      title: normalizeTitle(draft.title),
      slug: Slug.of(draft.slug).value,
      description: draft.description ?? null,
      specs: normalizeSpecs(context, draft.specs),
      warrantyMonths: normalizeWarranty(draft.warrantyMonths),
      variants,
      mediaIds,
      mediaOptionValues: normalizeMediaOptionValues(draft.mediaOptionValues, mediaIds, variants),
      accessoryIds: normalizeAccessoryIds(this.id, draft.accessoryIds),
      seoTitle: draft.seoTitle ?? null,
      seoDescription: draft.seoDescription ?? null,
      updatedAt: now,
    };
    if (this.data.status === 'ACTIVE') this.assertPublishable(context);
    this.record(
      createEvent('catalog.product.updated', this.data.storeId, this.id, { slug: this.data.slug, previousSlug, status: this.data.status }, now),
    );
    return newVariants;
  }

  /** Ce qui manque pour publier (règle 10) : vide si le produit est complet. */
  publishProblems(context: CategoryContext | null): PublishProblem[] {
    const problems: PublishProblem[] = [];
    if (!this.data.title.trim()) problems.push({ slug: 'title', name: 'Titre', message: 'titre manquant' });
    const variants = this.activeVariants;
    if (variants.length === 0) problems.push({ slug: 'variants', name: 'Variantes', message: 'aucune variante' });
    if (variants.some((variant) => !Number.isSafeInteger(variant.priceAmount) || variant.priceAmount < 0)) {
      problems.push({ slug: 'priceAmount', name: 'Prix', message: 'prix invalide' });
    }
    if (context) {
      problems.push(
        ...publishProblems(context.attributes, {
          specs: this.data.specs,
          variants: variants.map((variant) => ({ options: variant.options })),
        }),
      );
    }
    return problems;
  }

  private assertPublishable(context: CategoryContext | null): void {
    const problems = this.publishProblems(context);
    if (problems.length > 0) {
      throw new ProductNotPublishableError(problems.map((problem) => problem.message).join(' ; '), problems);
    }
  }

  /** R3 et règle 10 : titre, au moins une variante, prix valides, attributs obligatoires renseignés. */
  publish(context: CategoryContext | null, now: Date): void {
    if (this.data.status === 'ACTIVE') return;
    this.assertPublishable(context);
    this.data = { ...this.data, status: 'ACTIVE', publishedAt: now, archivedAt: null, updatedAt: now };
    this.record(createEvent('catalog.product.published', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  unpublish(now: Date): void {
    if (this.data.status !== 'ACTIVE') return;
    this.data = { ...this.data, status: 'DRAFT', updatedAt: now };
    this.record(createEvent('catalog.product.unpublished', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  archive(now: Date): void {
    if (this.data.status === 'ARCHIVED') return;
    this.data = { ...this.data, status: 'ARCHIVED', archivedAt: now, updatedAt: now };
    this.record(createEvent('catalog.product.archived', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  /**
   * Copie en brouillon (pattern Prototype) : nouveaux identifiants, nouveau slug, SKU réécrits,
   * sans stock (les unités IMEI appartiennent à l'original).
   */
  duplicate(input: { slug: string; skuFor: (sku: string) => string; context: CategoryContext; now: Date }): {
    product: Product;
    newVariants: NewVariant[];
  } {
    return Product.create(
      this.data.storeId,
      {
        title: `${this.data.title} (copie)`.slice(0, 200),
        slug: input.slug,
        description: this.data.description,
        brandId: this.data.brandId,
        reference: null,
        warrantyMonths: this.data.warrantyMonths,
        specs: structuredClone(this.data.specs),
        variants: this.activeVariants.map((variant) => {
          const data = variant.snapshot();
          return {
            sku: input.skuFor(data.sku),
            options: { ...data.options },
            priceAmount: data.priceAmount,
            compareAtAmount: data.compareAtAmount,
            costAmount: data.costAmount,
            barcode: null,
            imageMediaId: data.imageMediaId,
            trackInventory: data.trackInventory,
          };
        }),
        mediaIds: [...this.data.mediaIds],
        mediaOptionValues: { ...this.data.mediaOptionValues },
        accessoryIds: [...this.data.accessoryIds],
        seoTitle: this.data.seoTitle,
        seoDescription: this.data.seoDescription,
      },
      input.context,
      input.now,
    );
  }
}
