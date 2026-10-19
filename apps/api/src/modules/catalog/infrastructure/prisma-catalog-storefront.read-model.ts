import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  categoryDescendants,
  KINDS,
  type MediaDto,
  modelKey,
  OPTION_PRESETS,
  OPTION_TYPE_LABELS,
  OPTION_TYPES,
  type OptionType,
  type Paginated,
  type ProductKind,
  type StorefrontAccessoryDto,
  type StorefrontBrandDto,
  type StorefrontBundleDto,
  type StorefrontCollectionDto,
  type StorefrontFacetsDto,
  type StorefrontFacetsQuery,
  type StorefrontProductCardDto,
  type StorefrontProductDto,
  type VariantOptions,
} from '@marche/contracts';
import { Prisma } from '../../../generated/prisma/client.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { decodeCursor, toPage } from '../../../shared/application/pagination.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { MediaFacade } from '../../media/media.facade.js';
import {
  CatalogStorefrontReadModel,
  type StorefrontProductFilter,
  type VariantSnapshot,
} from '../application/catalog.read-model.js';
import type { PricingBundle } from '../domain/bundle-pricing.js';
import { parseSpecs, parseVariantOptions } from './prisma-catalog.repositories.js';
import { formatSpec, LEGACY_FILTER_KEYS, StorefrontTaxonomy } from './storefront-view.js';

interface CardRow {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  variant_options: Prisma.JsonValue[];
  brand_name: string | null;
  brand_slug: string | null;
  price_min: number;
  price_max: number;
  compare_at: number | null;
  media_id: string | null;
  sort_key: Date | number;
}

type EffectiveSort = 'position' | 'newest' | 'price-asc' | 'price-desc';

/** Accessoires affichés sur la fiche d'un appareil (choisis, puis compatibles). */
const MAX_SHOWN_ACCESSORIES = 12;
/** Au-delà, les filtres du site sont calculés sur un échantillon. */
const FACETS_SAMPLE = 2000;

/** Ordre d'affichage d'une valeur de filtre : celui des préréglages, puis l'ordre alphabétique. */
function presetRank(type: OptionType, value: string): number {
  const index = OPTION_PRESETS[type]?.indexOf(value) ?? -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/** Produit rangé dans l'une de ces catégories (aucune : aucun produit). */
function inCategories(ids: readonly string[]): Prisma.Sql {
  return ids.length ? Prisma.sql`AND p.category_id = ANY(${[...ids]}::uuid[])` : Prisma.sql`AND FALSE`;
}

@Injectable()
export class PrismaCatalogStorefrontReadModel extends CatalogStorefrontReadModel {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
    private readonly media: MediaFacade,
  ) {
    super();
  }

  async snapshotVariants(variantIds: readonly string[]): Promise<Map<string, VariantSnapshot>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.txHost.tx.productVariant.findMany({
      where: { id: { in: [...new Set(variantIds)] } },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            media: { orderBy: { position: 'asc' }, take: 1, select: { mediaId: true } },
          },
        },
      },
    });
    return new Map(
      rows.map((row) => {
        const archived = row.archivedAt !== null;
        return [
          row.id,
          {
            variantId: row.id,
            productId: row.product.id,
            productTitle: row.product.title,
            productSlug: row.product.slug,
            variantTitle: row.title,
            sku: row.sku,
            unitPriceAmount: row.priceAmount,
            compareAtAmount: row.compareAtAmount,
            trackInventory: row.trackInventory,
            imageMediaId: row.imageMediaId ?? row.product.media[0]?.mediaId ?? null,
            variantArchived: archived,
            sellable: !archived && row.product.status === 'ACTIVE',
          },
        ];
      }),
    );
  }

  async hasActiveProducts(): Promise<boolean> {
    const count = await this.txHost.tx.product.count({
      where: { status: 'ACTIVE', variants: { some: { archivedAt: null } } },
    });
    return count > 0;
  }

  async listCollections(): Promise<StorefrontCollectionDto[]> {
    const rows = await this.txHost.tx.collection.findMany({
      where: { isPublished: true },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
    });
    const images = await this.media.getMany(rows.flatMap((row) => (row.imageMediaId ? [row.imageMediaId] : [])));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      image: (row.imageMediaId && images.get(row.imageMediaId)) || null,
    }));
  }

  async getCollection(slug: string): Promise<StorefrontCollectionDto | null> {
    const row = await this.txHost.tx.collection.findFirst({ where: { slug, isPublished: true } });
    if (!row) return null;
    const images = await this.media.getMany(row.imageMediaId ? [row.imageMediaId] : []);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      image: (row.imageMediaId && images.get(row.imageMediaId)) || null,
    };
  }

  async listBrands(): Promise<StorefrontBrandDto[]> {
    const rows = await this.txHost.tx.brand.findMany({
      where: { archivedAt: null, products: { some: { status: 'ACTIVE' } } },
      orderBy: { name: 'asc' },
    });
    const logos = await this.media.getMany(rows.flatMap((row) => (row.logoMediaId ? [row.logoMediaId] : [])));
    return rows.map((row) => ({
      name: row.name,
      slug: row.slug,
      logo: (row.logoMediaId && logos.get(row.logoMediaId)) || null,
    }));
  }

  async categoriesById(ids: readonly string[]): Promise<Map<string, { name: string; slug: string }>> {
    if (ids.length === 0) return new Map();
    const rows = await this.txHost.tx.category.findMany({
      where: { id: { in: [...new Set(ids)] }, archivedAt: null },
      select: { id: true, name: true, slug: true },
    });
    return new Map(rows.map((row) => [row.id, { name: row.name, slug: row.slug }]));
  }

  /** undefined : aucun catalogue demandé ; null : catalogue introuvable ou non publié. */
  private async publishedCollectionId(slug: string | undefined): Promise<string | null | undefined> {
    if (!slug) return undefined;
    const collection = await this.txHost.tx.collection.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    return collection?.id ?? null;
  }

  async listProductCards(filter: StorefrontProductFilter): Promise<Paginated<StorefrontProductCardDto> | null> {
    const collectionId = await this.publishedCollectionId(filter.collectionSlug);
    if (collectionId === null) return null;
    const sort: EffectiveSort =
      filter.sort === 'featured' ? (collectionId ? 'position' : 'newest') : filter.sort;

    const joinCollection = collectionId
      ? Prisma.sql`JOIN collection_products cp ON cp.product_id = p.id AND cp.collection_id = ${collectionId}::uuid`
      : Prisma.empty;

    const taxonomy = await this.taxonomy();
    const where: Prisma.Sql[] = [];
    const having: Prisma.Sql[] = [];
    if (filter.categorySlug) {
      const category = taxonomy.categories.find((c) => c.slug === filter.categorySlug);
      if (!category) return null;
      where.push(inCategories(categoryDescendants(category.id, taxonomy.categories)));
    }
    if (filter.brandSlug) where.push(Prisma.sql`AND b.slug = ${filter.brandSlug}`);
    if (filter.kind) where.push(inCategories(taxonomy.categoryIdsOfKind(filter.kind)));
    // Nature d'option (color, storage…) → axes de cette nature, portés par variants.options.
    for (const { type, values } of filter.options ?? []) {
      const slugs = taxonomy.axisSlugsOfType(type);
      where.push(
        slugs.length
          ? Prisma.sql`AND EXISTS (
              SELECT 1 FROM product_variants fv
              WHERE fv.product_id = p.id AND fv.archived_at IS NULL
                AND (${Prisma.join(
                  slugs.map((slug) => Prisma.sql`fv.options->>${slug} = ANY(${values}::text[])`),
                  ' OR ',
                )}))`
          : Prisma.sql`AND FALSE`,
      );
    }
    for (const { key, values } of filter.attributes ?? []) {
      if (key === 'accessoryType') {
        where.push(inCategories(taxonomy.categoryIdsOfAccessoryTypes(values)));
        continue;
      }
      const legacy = LEGACY_FILTER_KEYS[key];
      const slug = legacy?.slug ?? key;
      const wanted = legacy ? values.map(legacy.value) : values;
      const attribute = taxonomy.attribute(slug);
      if (!attribute?.filterable || attribute.isVariantAxis) continue;
      where.push(Prisma.sql`AND (p.specs->>${slug} = ANY(${wanted}::text[])
        OR (jsonb_typeof(p.specs->${slug}) = 'array' AND jsonb_exists_any(p.specs->${slug}, ${wanted}::text[])))`);
    }
    if (filter.priceMin !== undefined) having.push(Prisma.sql`MIN(v.price_amount) >= ${filter.priceMin}`);
    if (filter.priceMax !== undefined) having.push(Prisma.sql`MIN(v.price_amount) <= ${filter.priceMax}`);

    let sortKey: Prisma.Sql;
    let orderBy: Prisma.Sql;
    const cursor = filter.cursor ? decodeCursor(filter.cursor, 2) : null;
    switch (sort) {
      case 'position':
        sortKey = Prisma.sql`cp.position`;
        orderBy = Prisma.sql`cp.position ASC, p.id ASC`;
        if (cursor) where.push(Prisma.sql`AND (cp.position, p.id) > (${Number(cursor[0])}, ${String(cursor[1])}::uuid)`);
        break;
      case 'newest':
        sortKey = Prisma.sql`COALESCE(p.published_at, p.created_at)`;
        orderBy = Prisma.sql`sort_key DESC, p.id DESC`;
        if (cursor) {
          where.push(
            Prisma.sql`AND (COALESCE(p.published_at, p.created_at), p.id) < (${new Date(String(cursor[0]))}, ${String(cursor[1])}::uuid)`,
          );
        }
        break;
      case 'price-asc':
        sortKey = Prisma.sql`MIN(v.price_amount)`;
        orderBy = Prisma.sql`MIN(v.price_amount) ASC, p.id ASC`;
        if (cursor) having.push(Prisma.sql`(MIN(v.price_amount), p.id) > (${Number(cursor[0])}, ${String(cursor[1])}::uuid)`);
        break;
      case 'price-desc':
        sortKey = Prisma.sql`MIN(v.price_amount)`;
        orderBy = Prisma.sql`MIN(v.price_amount) DESC, p.id DESC`;
        if (cursor) having.push(Prisma.sql`(MIN(v.price_amount), p.id) < (${Number(cursor[0])}, ${String(cursor[1])}::uuid)`);
        break;
    }

    const rows = await this.txHost.tx.$queryRaw<CardRow[]>`
      SELECT p.id, p.title, p.slug, p.category_id, jsonb_agg(v.options ORDER BY v.position) AS variant_options,
             b.name AS brand_name, b.slug AS brand_slug,
             MIN(v.price_amount) AS price_min, MAX(v.price_amount) AS price_max,
             (array_agg(v.compare_at_amount ORDER BY v.price_amount, v.position))[1] AS compare_at,
             (SELECT pm.media_id FROM product_media pm WHERE pm.product_id = p.id ORDER BY pm.position LIMIT 1) AS media_id,
             ${sortKey} AS sort_key
      FROM products p
      JOIN product_variants v ON v.product_id = p.id AND v.archived_at IS NULL
      LEFT JOIN brands b ON b.id = p.brand_id AND b.archived_at IS NULL
      ${joinCollection}
      WHERE p.store_id = ${this.actor.storeId}::uuid AND p.status = 'ACTIVE' ${where.length ? Prisma.join(where, ' ') : Prisma.empty}
      GROUP BY p.id, b.name, b.slug${collectionId ? Prisma.sql`, cp.position` : Prisma.empty}
      ${having.length ? Prisma.sql`HAVING ${Prisma.join(having, ' AND ')}` : Prisma.empty}
      ORDER BY ${orderBy}
      LIMIT ${filter.limit + 1}`;

    const page = toPage(rows, filter.limit, (row) => [
      row.sort_key instanceof Date ? row.sort_key.toISOString() : Number(row.sort_key),
      row.id,
    ]);
    const images = await this.media.getMany(
      page.items.map((row) => row.media_id).filter((id): id is string => id !== null),
    );
    return {
      nextCursor: page.nextCursor,
      items: page.items.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        brand: row.brand_name && row.brand_slug ? { name: row.brand_name, slug: row.brand_slug } : null,
        priceMinAmount: row.price_min,
        priceMaxAmount: row.price_max,
        compareAtAmount: row.compare_at,
        image: (row.media_id && images.get(row.media_id)) || null,
        kind: taxonomy.kind(row.category_id),
        swatches: taxonomy.swatches(row.category_id, row.variant_options.map(parseVariantOptions)),
      })),
    };
  }

  async getProduct(slug: string): Promise<StorefrontProductDto | null> {
    const row = await this.txHost.tx.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        brand: { select: { name: true, slug: true, archivedAt: true } },
        variants: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
        media: { orderBy: { position: 'asc' }, select: { mediaId: true, optionValue: true } },
        relations: {
          where: { type: 'ACCESSORY' },
          orderBy: { position: 'asc' },
          select: { relatedProductId: true },
        },
        bundlesAnchored: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          include: { items: { orderBy: { position: 'asc' }, select: { productId: true } } },
        },
      },
    });
    if (!row || row.variants.length === 0) return null;
    const taxonomy = await this.taxonomy();
    const specs = parseSpecs(row.specs);
    const variantOptions = row.variants.map((variant) => parseVariantOptions(variant.options));
    const { options, valuesOf } = taxonomy.options(row.categoryId, variantOptions);
    const category = taxonomy.category(row.categoryId);

    // Accessoires dont la « Compatibilité » cite l'appareil (son titre ou son modèle).
    const compatibleIds = taxonomy.isDevice(row.categoryId)
      ? await this.compatibleAccessoryIds(row.id, [row.title, typeof specs.modele === 'string' ? specs.modele : ''])
      : [];
    const accessoryIds = [...new Set([...row.relations.map((r) => r.relatedProductId), ...compatibleIds])].filter(
      (id) => id !== row.id,
    );
    const bundleItemIds = row.bundlesAnchored.flatMap((bundle) => bundle.items.map((item) => item.productId));

    const [media, cards] = await Promise.all([
      this.media.getMany(row.media.map((m) => m.mediaId)),
      this.accessoryCards([...accessoryIds, ...bundleItemIds], taxonomy),
    ]);
    const images: MediaDto[] = row.media.flatMap((m) => {
      const dto = media.get(m.mediaId);
      return dto && dto.status !== 'FAILED' ? [dto] : [];
    });
    const shown = new Set(images.map((image) => image.id));

    const bundles: StorefrontBundleDto[] = row.bundlesAnchored.flatMap((bundle) => {
      const items = bundle.items.map((item) => cards.get(item.productId));
      // Un pack n'est proposé que si tous ses articles sont en vente.
      if (items.length === 0 || items.some((item) => !item)) return [];
      return [
        {
          id: bundle.id,
          title: bundle.title,
          discountType: bundle.discountType,
          discountValue: bundle.discountValue,
          items: items as StorefrontAccessoryDto[],
        },
      ];
    });

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      brand: row.brand && !row.brand.archivedAt ? { name: row.brand.name, slug: row.brand.slug } : null,
      category: category ? { name: category.name, slug: category.slug, path: taxonomy.pathSlugs(row.categoryId) } : null,
      // Posé par la couche application, qui connaît les réglages de la boutique.
      sizeGuide: null,
      specs: taxonomy.specs(row.categoryId, specs),
      warrantyMonths: row.warrantyMonths,
      kind: taxonomy.kind(row.categoryId),
      attributes: taxonomy.legacyAttributes(row.categoryId, specs, row.warrantyMonths),
      options,
      variants: row.variants.map((variant, index) => {
        const opts = variantOptions[index] ?? {};
        return {
          id: variant.id,
          title: variant.title,
          optionValues: valuesOf(opts),
          options: opts,
          priceAmount: variant.priceAmount,
          compareAtAmount: variant.compareAtAmount,
          sku: variant.sku,
        };
      }),
      images,
      imageOptionValues: Object.fromEntries(
        row.media.flatMap((m) => (m.optionValue && shown.has(m.mediaId) ? [[m.mediaId, m.optionValue]] : [])),
      ),
      accessories: accessoryIds
        .map((id) => cards.get(id))
        .filter((card): card is StorefrontAccessoryDto => card !== undefined)
        .slice(0, MAX_SHOWN_ACCESSORIES),
      bundles,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Articles publiés dont la « Compatibilité » (specs.compatibilite, règle 7) cite l'appareil. */
  private async compatibleAccessoryIds(productId: string, models: readonly string[]): Promise<string[]> {
    const keys = [...new Set(models.map(modelKey).filter(Boolean))];
    if (keys.length === 0) return [];
    const rows = await this.txHost.tx.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM products p
      WHERE p.store_id = ${this.actor.storeId}::uuid AND p.status = 'ACTIVE'
        AND p.id <> ${productId}::uuid
        AND jsonb_typeof(p.specs->'compatibilite') = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.specs->'compatibilite') AS m(model)
          WHERE lower(regexp_replace(btrim(normalize(m.model, NFKD)), '\\s+', ' ', 'g')) = ANY(${keys}::text[]))
      ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id
      LIMIT ${MAX_SHOWN_ACCESSORIES}`;
    return rows.map((r) => r.id);
  }

  /** Cartes d'accessoires ou d'articles de pack, avec leurs déclinaisons vendables. */
  private async accessoryCards(ids: string[], taxonomy: StorefrontTaxonomy): Promise<Map<string, StorefrontAccessoryDto>> {
    if (ids.length === 0) return new Map();
    const rows = await this.txHost.tx.product.findMany({
      where: { id: { in: [...new Set(ids)] }, status: 'ACTIVE' },
      include: {
        brand: { select: { name: true, slug: true, archivedAt: true } },
        variants: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
        media: { orderBy: { position: 'asc' }, take: 1, select: { mediaId: true } },
      },
    });
    const media = await this.media.getMany(rows.flatMap((r) => r.media.map((m) => m.mediaId)));
    return new Map(
      rows
        .filter((r) => r.variants.length > 0)
        .map((r) => {
          const cheapest = r.variants.reduce((a, b) => (b.priceAmount < a.priceAmount ? b : a));
          const prices = r.variants.map((v) => v.priceAmount);
          const thumbnailId = r.media[0]?.mediaId;
          const card: StorefrontAccessoryDto = {
            id: r.id,
            title: r.title,
            slug: r.slug,
            brand: r.brand && !r.brand.archivedAt ? { name: r.brand.name, slug: r.brand.slug } : null,
            priceMinAmount: Math.min(...prices),
            priceMaxAmount: Math.max(...prices),
            compareAtAmount: cheapest.compareAtAmount,
            image: (thumbnailId && media.get(thumbnailId)) || null,
            kind: taxonomy.kind(r.categoryId),
            swatches: taxonomy.swatches(r.categoryId, r.variants.map((v) => parseVariantOptions(v.options))),
            variantId: r.variants.length === 1 ? r.variants[0]!.id : null,
            variants: r.variants.map((v) => ({ id: v.id, title: v.title, priceAmount: v.priceAmount })),
            attributes: taxonomy.legacyAttributes(r.categoryId, parseSpecs(r.specs), r.warrantyMonths),
          };
          return [r.id, card] as const;
        }),
    );
  }

  async facets(query: StorefrontFacetsQuery): Promise<StorefrontFacetsDto | null> {
    const collectionId = await this.publishedCollectionId(query.collection);
    if (collectionId === null) return null;
    const taxonomy = await this.taxonomy();
    const rows = await this.txHost.tx.product.findMany({
      where: {
        status: 'ACTIVE',
        variants: { some: { archivedAt: null } },
        ...(query.kind ? { categoryId: { in: taxonomy.categoryIdsOfKind(query.kind) } } : {}),
        ...(collectionId ? { collections: { some: { collectionId } } } : {}),
      },
      select: {
        categoryId: true,
        specs: true,
        brand: { select: { name: true, slug: true, archivedAt: true } },
        variants: { where: { archivedAt: null }, select: { options: true, priceAmount: true } },
      },
      take: FACETS_SAMPLE,
    });

    const kinds = new Map<ProductKind, number>();
    const brands = new Map<string, { name: string; count: number }>();
    const options = new Map<OptionType, Map<string, { swatch: string | null; count: number }>>();
    const attributes = new Map<string, Map<string, { label: string; count: number }>>();
    let priceMin = Number.POSITIVE_INFINITY;
    let priceMax = 0;

    for (const row of rows) {
      const kind = taxonomy.kind(row.categoryId);
      if (kind) kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
      if (row.brand && !row.brand.archivedAt) {
        const entry = brands.get(row.brand.slug) ?? { name: row.brand.name, count: 0 };
        entry.count += 1;
        brands.set(row.brand.slug, entry);
      }
      const cheapest = Math.min(...row.variants.map((v) => v.priceAmount));
      priceMin = Math.min(priceMin, cheapest);
      priceMax = Math.max(priceMax, cheapest);

      const variantOptions: VariantOptions[] = row.variants.map((v) => parseVariantOptions(v.options));
      for (const option of taxonomy.options(row.categoryId, variantOptions).options) {
        if (!option.type || option.type === 'text') continue;
        const bucket = options.get(option.type) ?? new Map<string, { swatch: string | null; count: number }>();
        for (const value of option.values) {
          const entry = bucket.get(value) ?? { swatch: option.swatches?.[value] ?? null, count: 0 };
          entry.count += 1;
          bucket.set(value, entry);
        }
        options.set(option.type, bucket);
      }

      // Attributs filtrables de la fiche (hors axes, déjà montrés par les options).
      for (const [slug, raw] of Object.entries(parseSpecs(row.specs))) {
        const attribute = taxonomy.attribute(slug);
        if (!attribute?.filterable || attribute.isVariantAxis || attribute.type === 'TEXT') continue;
        const bucket = attributes.get(slug) ?? new Map<string, { label: string; count: number }>();
        for (const value of new Set(Array.isArray(raw) ? raw : [raw])) {
          const entry = bucket.get(String(value)) ?? { label: formatSpec(value, attribute.unit), count: 0 };
          entry.count += 1;
          bucket.set(String(value), entry);
        }
        attributes.set(slug, bucket);
      }
    }

    return {
      kinds: [...kinds].map(([value, count]) => ({ value, label: KINDS[value].plural, count })),
      brands: [...brands]
        .map(([slug, { name, count }]) => ({ slug, name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      options: OPTION_TYPES.flatMap((type) => {
        const bucket = options.get(type);
        if (!bucket || bucket.size === 0) return [];
        const values = [...bucket]
          .map(([value, { swatch, count }]) => ({ value, swatch, count }))
          .sort(
            (a, b) =>
              presetRank(type, a.value) - presetRank(type, b.value) ||
              a.value.localeCompare(b.value, 'fr', { numeric: true }),
          );
        return [{ type, label: OPTION_TYPE_LABELS[type], values }];
      }),
      // Dans l'ordre des attributs de la boutique ; les valeurs dans l'ordre de l'attribut.
      attributes: taxonomy.attributes.flatMap((attribute) => {
        const bucket = attributes.get(attribute.slug);
        if (!bucket) return [];
        const rank = (value: string) => {
          const index = attribute.values.findIndex((v) => v.value === value);
          return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };
        return [
          {
            key: attribute.slug,
            label: attribute.name,
            values: [...bucket]
              .map(([value, { label, count }]) => ({ value, label, count }))
              .sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value, 'fr', { numeric: true })),
          },
        ];
      }),
      price: rows.length ? { min: priceMin, max: priceMax } : null,
    };
  }

  async activeBundles(anchorProductIds: readonly string[]): Promise<PricingBundle[]> {
    if (anchorProductIds.length === 0) return [];
    const rows = await this.txHost.tx.bundle.findMany({
      where: { isActive: true, anchorProductId: { in: [...new Set(anchorProductIds)] } },
      include: { items: { orderBy: { position: 'asc' }, select: { productId: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      anchorProductId: row.anchorProductId,
      itemProductIds: row.items.map((item) => item.productId),
      discountType: row.discountType,
      discountValue: row.discountValue,
    }));
  }

  /** Catégories actives et attributs (archivés compris, pour les libellés des fiches existantes). */
  private async taxonomy(): Promise<StorefrontTaxonomy> {
    const [categories, attributes, links] = await Promise.all([
      this.txHost.tx.category.findMany({
        where: { archivedAt: null },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, parentId: true, name: true, slug: true, tracksUnits: true },
      }),
      this.txHost.tx.attribute.findMany({
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        include: { values: { orderBy: { position: 'asc' } } },
      }),
      this.txHost.tx.categoryAttribute.findMany({
        where: { category: { archivedAt: null }, attribute: { archivedAt: null } },
        select: { categoryId: true, attributeId: true, required: true, position: true },
      }),
    ]);
    return new StorefrontTaxonomy(
      categories,
      attributes.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        type: row.type,
        unit: row.unit,
        isVariantAxis: row.isVariantAxis,
        filterable: row.filterable,
        values: row.values.map((value) => ({ value: value.value, code: value.code, swatch: value.swatch })),
      })),
      links,
    );
  }
}
