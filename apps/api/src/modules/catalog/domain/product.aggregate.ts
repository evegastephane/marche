import {
  MAX_PRODUCT_MEDIA,
  MAX_PRODUCT_OPTIONS,
  MAX_PRODUCT_VARIANTS,
  type ProductOption,
  type ProductStatus,
} from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { newId } from '../../../shared/domain/id.js';
import { Slug } from '../../../shared/domain/slug.vo.js';
import { InvalidProductError, ProductNotPublishableError } from './catalog.errors.js';
import { ProductVariant, type VariantDraft } from './product-variant.entity.js';

export interface ProductData {
  storeId: string;
  brandId: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  options: ProductOption[];
  variants: ProductVariant[];
  mediaIds: string[];
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
  options: ProductOption[];
  variants: VariantDraft[];
  mediaIds: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

/** Variante créée par une opération : l'inventaire initialise son stock dans la même transaction. */
export interface NewVariant {
  variantId: string;
  initialQuantity: number;
}

const key = (value: string) => value.trim().toLocaleLowerCase('fr');

function normalizeOptions(options: readonly ProductOption[]): ProductOption[] {
  if (options.length > MAX_PRODUCT_OPTIONS) {
    throw new InvalidProductError(`${MAX_PRODUCT_OPTIONS} options maximum (ex. taille, couleur, matière)`, 'options');
  }
  const names = new Set<string>();
  return options.map((option) => {
    const name = option.name.trim();
    if (!name) throw new InvalidProductError('Nom d’option vide', 'options');
    if (names.has(key(name))) throw new InvalidProductError(`Option en double : « ${name} »`, 'options');
    names.add(key(name));
    const values = option.values.map((value) => value.trim()).filter(Boolean);
    if (values.length === 0) throw new InvalidProductError(`L’option « ${name} » n’a aucune valeur`, 'options');
    if (new Set(values.map(key)).size !== values.length) {
      throw new InvalidProductError(`Valeur en double dans l’option « ${name} »`, 'options');
    }
    return { name, values };
  });
}

/** R2 + cohérence options/variantes : au moins une variante, combinaisons et SKU uniques. */
function assertVariantsMatchOptions(options: readonly ProductOption[], drafts: readonly VariantDraft[]): void {
  if (drafts.length === 0) throw new InvalidProductError('Un produit a au moins une variante', 'variants');
  if (drafts.length > MAX_PRODUCT_VARIANTS) {
    throw new InvalidProductError(`${MAX_PRODUCT_VARIANTS} variantes maximum`, 'variants');
  }
  if (options.length === 0 && drafts.length > 1) {
    throw new InvalidProductError('Sans option, un produit n’a qu’une variante', 'variants');
  }
  const combinations = new Set<string>();
  const skus = new Set<string>();
  for (const draft of drafts) {
    const values = draft.optionValues.map((value) => value.trim());
    if (values.length !== options.length) {
      throw new InvalidProductError('Chaque variante doit avoir une valeur par option', 'variants');
    }
    values.forEach((value, index) => {
      const option = options[index];
      if (!option || !option.values.some((allowed) => key(allowed) === key(value))) {
        throw new InvalidProductError(`Valeur inconnue « ${value} » pour l’option « ${option?.name ?? index} »`, 'variants');
      }
    });
    const combination = values.map(key).join('|');
    if (combinations.has(combination)) {
      throw new InvalidProductError(`Combinaison en double : ${values.join(' / ') || 'Par défaut'}`, 'variants');
    }
    combinations.add(combination);
    if (skus.has(key(draft.sku))) throw new InvalidProductError(`SKU en double : « ${draft.sku} »`, 'variants');
    skus.add(key(draft.sku));
  }
}

function normalizeMediaIds(mediaIds: readonly string[]): string[] {
  const unique = [...new Set(mediaIds)];
  if (unique.length > MAX_PRODUCT_MEDIA) {
    throw new InvalidProductError(`${MAX_PRODUCT_MEDIA} images maximum`, 'mediaIds');
  }
  return unique;
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) throw new InvalidProductError('Titre requis (200 caractères maximum)', 'title');
  return trimmed;
}

/** Produit cartésien des valeurs d'options : toutes les combinaisons de variantes possibles. */
export function variantCombinations(options: readonly ProductOption[]): string[][] {
  return options.reduce<string[][]>(
    (combinations, option) => combinations.flatMap((prefix) => option.values.map((value) => [...prefix, value])),
    [[]],
  );
}

export class Product extends AggregateRoot {
  private constructor(
    id: string,
    private data: ProductData,
    version = 0,
  ) {
    super(id, version);
  }

  static create(storeId: string, draft: ProductDraft, now: Date, id: string = newId()): { product: Product; newVariants: NewVariant[] } {
    const options = normalizeOptions(draft.options);
    assertVariantsMatchOptions(options, draft.variants);
    const variants = draft.variants.map((variant, index) => ProductVariant.fromDraft(variant, index));
    const product = new Product(id, {
      storeId,
      brandId: draft.brandId ?? null,
      title: normalizeTitle(draft.title),
      slug: Slug.of(draft.slug).value,
      description: draft.description ?? null,
      status: 'DRAFT',
      options,
      variants,
      mediaIds: normalizeMediaIds(draft.mediaIds),
      seoTitle: draft.seoTitle ?? null,
      seoDescription: draft.seoDescription ?? null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    product.record(
      createEvent('catalog.product.created', storeId, id, { title: product.data.title, slug: product.data.slug }, now),
    );
    return {
      product,
      newVariants: variants.map((variant, index) => ({
        variantId: variant.id,
        initialQuantity: draft.variants[index]?.initialQuantity ?? 0,
      })),
    };
  }

  static reconstitute(id: string, data: ProductData, version: number): Product {
    return new Product(id, { ...data, variants: [...data.variants], mediaIds: [...data.mediaIds] }, version);
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

  /** Toutes les variantes, archivées comprises (l'historique des commandes y fait référence). */
  get variants(): readonly ProductVariant[] {
    return this.data.variants;
  }

  get activeVariants(): ProductVariant[] {
    return this.data.variants.filter((variant) => !variant.isArchived);
  }

  snapshot(): Readonly<ProductData> {
    return { ...this.data, variants: [...this.data.variants], mediaIds: [...this.data.mediaIds] };
  }

  /**
   * Mise à jour complète depuis le formulaire. Les variantes absentes sont archivées (jamais supprimées :
   * leur stock et leur historique restent), les nouvelles sont retournées pour l'initialisation du stock.
   */
  update(draft: ProductDraft, now: Date): NewVariant[] {
    const options = normalizeOptions(draft.options);
    assertVariantsMatchOptions(options, draft.variants);

    const existing = new Map(this.activeVariants.map((variant) => [variant.id, variant]));
    const kept = new Set<string>();
    const newVariants: NewVariant[] = [];
    const active = draft.variants.map((variantDraft, position) => {
      if (variantDraft.id) {
        if (!existing.has(variantDraft.id)) {
          throw new InvalidProductError(`Variante inconnue : ${variantDraft.id}`, 'variants');
        }
        kept.add(variantDraft.id);
        return ProductVariant.fromDraft(variantDraft, position, variantDraft.id);
      }
      const created = ProductVariant.fromDraft(variantDraft, position);
      newVariants.push({ variantId: created.id, initialQuantity: variantDraft.initialQuantity ?? 0 });
      return created;
    });
    const archived = this.data.variants
      .filter((variant) => variant.isArchived || !kept.has(variant.id))
      .map((variant) => variant.archived(now));

    const previousSlug = this.data.slug;
    this.data = {
      ...this.data,
      brandId: draft.brandId ?? null,
      title: normalizeTitle(draft.title),
      slug: Slug.of(draft.slug).value,
      description: draft.description ?? null,
      options,
      variants: [...active, ...archived],
      mediaIds: normalizeMediaIds(draft.mediaIds),
      seoTitle: draft.seoTitle ?? null,
      seoDescription: draft.seoDescription ?? null,
      updatedAt: now,
    };
    this.record(
      createEvent(
        'catalog.product.updated',
        this.data.storeId,
        this.id,
        { slug: this.data.slug, previousSlug, status: this.data.status },
        now,
      ),
    );
    return newVariants;
  }

  /** R3 : titre, au moins une variante active, prix valides. */
  publish(now: Date): void {
    if (this.data.status === 'ACTIVE') return;
    if (!this.data.title.trim()) throw new ProductNotPublishableError('titre manquant');
    const variants = this.activeVariants;
    if (variants.length === 0) throw new ProductNotPublishableError('aucune variante');
    if (variants.some((variant) => !Number.isSafeInteger(variant.priceAmount) || variant.priceAmount < 0)) {
      throw new ProductNotPublishableError('prix invalide');
    }
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

  /** Copie en brouillon (pattern Prototype) : nouveaux identifiants, nouveau slug, SKU réécrits. */
  duplicate(input: { slug: string; skuFor: (sku: string) => string; now: Date }): {
    product: Product;
    newVariants: NewVariant[];
  } {
    const title = `${this.data.title} (copie)`.slice(0, 200);
    return Product.create(
      this.data.storeId,
      {
        title,
        slug: input.slug,
        description: this.data.description,
        brandId: this.data.brandId,
        options: this.data.options.map((option) => ({ name: option.name, values: [...option.values] })),
        variants: this.activeVariants.map((variant) => {
          const data = variant.snapshot();
          return {
            sku: input.skuFor(data.sku),
            optionValues: [...data.optionValues],
            priceAmount: data.priceAmount,
            compareAtAmount: data.compareAtAmount,
            trackInventory: data.trackInventory,
          };
        }),
        mediaIds: [...this.data.mediaIds],
        seoTitle: this.data.seoTitle,
        seoDescription: this.data.seoDescription,
      },
      input.now,
    );
  }
}
