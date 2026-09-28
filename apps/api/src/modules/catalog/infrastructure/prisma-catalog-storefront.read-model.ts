import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  DEVICE_KINDS,
  FILTERABLE_ATTRIBUTES,
  KINDS,
  type MediaDto,
  modelKey,
  OPTION_PRESETS,
  OPTION_TYPE_LABELS,
  OPTION_TYPES,
  type OptionType,
  type Paginated,
  type ProductKind,
  type ProductOption,
  type StorefrontAccessoryDto,
  type StorefrontBrandDto,
  type StorefrontBundleDto,
  type StorefrontCollectionDto,
  type StorefrontFacetsDto,
  type StorefrontFacetsQuery,
  type StorefrontProductCardDto,
  type StorefrontProductDto,
  swatchFor,
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
import { parseAttributesJson, parseKind, parseOptions, parseStringArray } from './prisma-catalog.repositories.js';

interface CardRow {
  id: string;
  title: string;
  slug: string;
  kind: string | null;
  options: Prisma.JsonValue;
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

const variantTitle = (optionValues: string[]) => (optionValues.length ? optionValues.join(' / ') : 'Par défaut');

/** Pastilles d'un article : valeurs de son option « couleur » qui ont une teinte. */
function cardSwatches(options: ProductOption[]): { value: string; hex: string }[] {
  const color = options.find((option) => option.type === 'color');
  if (!color) return [];
  return color.values.flatMap((value) => {
    const hex = swatchFor(color, value);
    return hex ? [{ value, hex }] : [];
  });
}

/** Ordre d'affichage d'une valeur de filtre : celui des préréglages, puis l'ordre alphabétique. */
function presetRank(type: OptionType, value: string): number {
  const index = OPTION_PRESETS[type]?.indexOf(value) ?? -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
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
        const optionValues = parseStringArray(row.optionValues);
        const archived = row.archivedAt !== null;
        return [
          row.id,
          {
            variantId: row.id,
            productId: row.product.id,
            productTitle: row.product.title,
            productSlug: row.product.slug,
            variantTitle: variantTitle(optionValues),
            sku: row.sku,
            unitPriceAmount: row.priceAmount,
            compareAtAmount: row.compareAtAmount,
            trackInventory: row.trackInventory,
            imageMediaId: row.product.media[0]?.mediaId ?? null,
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

    const where: Prisma.Sql[] = [];
    const having: Prisma.Sql[] = [];
    if (filter.brandSlug) where.push(Prisma.sql`AND b.slug = ${filter.brandSlug}`);
    if (filter.kind) where.push(Prisma.sql`AND p.kind = ${filter.kind}`);
    // Une valeur d'option est portée par la position de l'option dans le produit.
    for (const { type, values } of filter.options ?? []) {
      where.push(Prisma.sql`AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(p.options) WITH ORDINALITY AS opt(def, idx)
        JOIN product_variants fv ON fv.product_id = p.id AND fv.archived_at IS NULL
        WHERE opt.def->>'type' = ${type} AND fv.option_values->>(opt.idx::int - 1) = ANY(${values}::text[]))`);
    }
    const filterable = new Set(FILTERABLE_ATTRIBUTES.map((field) => field.key));
    for (const { key, values } of filter.attributes ?? []) {
      if (!filterable.has(key)) continue;
      where.push(Prisma.sql`AND (p.attributes->>${key} = ANY(${values}::text[])
        OR (jsonb_typeof(p.attributes->${key}) = 'array' AND jsonb_exists_any(p.attributes->${key}, ${values}::text[])))`);
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
      SELECT p.id, p.title, p.slug, p.kind, p.options, b.name AS brand_name, b.slug AS brand_slug,
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
        kind: parseKind(row.kind),
        swatches: cardSwatches(parseOptions(row.options)),
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
    const kind = parseKind(row.kind);
    const attributes = parseAttributesJson(row.attributes);

    const compatibleIds =
      kind && DEVICE_KINDS.includes(kind) && typeof attributes.model === 'string'
        ? await this.compatibleAccessoryIds(row.id, attributes.model)
        : [];
    const accessoryIds = [...new Set([...row.relations.map((r) => r.relatedProductId), ...compatibleIds])].filter(
      (id) => id !== row.id,
    );
    const bundleItemIds = row.bundlesAnchored.flatMap((bundle) => bundle.items.map((item) => item.productId));

    const [media, cards] = await Promise.all([
      this.media.getMany(row.media.map((m) => m.mediaId)),
      this.accessoryCards([...accessoryIds, ...bundleItemIds]),
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
      kind,
      attributes,
      options: parseOptions(row.options),
      variants: row.variants.map((variant) => {
        const optionValues = parseStringArray(variant.optionValues);
        return {
          id: variant.id,
          title: variantTitle(optionValues),
          optionValues,
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

  /** Accessoires publiés dont la liste « Compatible avec » cite le modèle de l'appareil. */
  private async compatibleAccessoryIds(productId: string, model: string): Promise<string[]> {
    const key = modelKey(model);
    if (!key) return [];
    const rows = await this.txHost.tx.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM products p
      WHERE p.store_id = ${this.actor.storeId}::uuid AND p.status = 'ACTIVE' AND p.kind = 'ACCESSORY'
        AND p.id <> ${productId}::uuid
        AND jsonb_typeof(p.attributes->'compatibleModels') = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.attributes->'compatibleModels') AS m(model)
          WHERE lower(regexp_replace(btrim(normalize(m.model, NFKD)), '\\s+', ' ', 'g')) = ${key})
      ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id
      LIMIT ${MAX_SHOWN_ACCESSORIES}`;
    return rows.map((r) => r.id);
  }

  /** Cartes d'accessoires ou d'articles de pack, avec leurs déclinaisons vendables. */
  private async accessoryCards(ids: string[]): Promise<Map<string, StorefrontAccessoryDto>> {
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
            kind: parseKind(r.kind),
            swatches: cardSwatches(parseOptions(r.options)),
            variantId: r.variants.length === 1 ? r.variants[0]!.id : null,
            variants: r.variants.map((v) => ({
              id: v.id,
              title: variantTitle(parseStringArray(v.optionValues)),
              priceAmount: v.priceAmount,
            })),
            attributes: parseAttributesJson(r.attributes),
          };
          return [r.id, card] as const;
        }),
    );
  }

  async facets(query: StorefrontFacetsQuery): Promise<StorefrontFacetsDto | null> {
    const collectionId = await this.publishedCollectionId(query.collection);
    if (collectionId === null) return null;
    const rows = await this.txHost.tx.product.findMany({
      where: {
        status: 'ACTIVE',
        variants: { some: { archivedAt: null } },
        ...(query.kind ? { kind: query.kind } : {}),
        ...(collectionId ? { collections: { some: { collectionId } } } : {}),
      },
      select: {
        kind: true,
        options: true,
        attributes: true,
        brand: { select: { name: true, slug: true, archivedAt: true } },
        variants: { where: { archivedAt: null }, select: { optionValues: true, priceAmount: true } },
      },
      take: FACETS_SAMPLE,
    });

    const kinds = new Map<ProductKind, number>();
    const brands = new Map<string, { name: string; count: number }>();
    const options = new Map<OptionType, Map<string, { swatch: string | null; count: number }>>();
    const attributes = new Map<string, Map<string, number>>();
    let priceMin = Number.POSITIVE_INFINITY;
    let priceMax = 0;

    for (const row of rows) {
      const kind = parseKind(row.kind);
      if (kind) kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
      if (row.brand && !row.brand.archivedAt) {
        const entry = brands.get(row.brand.slug) ?? { name: row.brand.name, count: 0 };
        entry.count += 1;
        brands.set(row.brand.slug, entry);
      }
      const cheapest = Math.min(...row.variants.map((v) => v.priceAmount));
      priceMin = Math.min(priceMin, cheapest);
      priceMax = Math.max(priceMax, cheapest);

      const variantValues = row.variants.map((v) => parseStringArray(v.optionValues));
      parseOptions(row.options).forEach((option, index) => {
        if (!option.type || option.type === 'text') return;
        const offered = new Set(variantValues.map((values) => values[index]).filter((v): v is string => !!v));
        const bucket = options.get(option.type) ?? new Map<string, { swatch: string | null; count: number }>();
        for (const value of offered) {
          const entry = bucket.get(value) ?? { swatch: option.type === 'color' ? swatchFor(option, value) : null, count: 0 };
          entry.count += 1;
          bucket.set(value, entry);
        }
        options.set(option.type, bucket);
      });

      const attrs = parseAttributesJson(row.attributes);
      for (const field of FILTERABLE_ATTRIBUTES) {
        const raw = attrs[field.key];
        const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
        if (values.length === 0) continue;
        const bucket = attributes.get(field.key) ?? new Map<string, number>();
        for (const value of new Set(values)) bucket.set(value, (bucket.get(value) ?? 0) + 1);
        attributes.set(field.key, bucket);
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
      attributes: FILTERABLE_ATTRIBUTES.flatMap((field) => {
        const bucket = attributes.get(field.key);
        if (!bucket) return [];
        const order = (value: string) => field.choices?.findIndex((c) => c.value === value) ?? -1;
        return [
          {
            key: field.key,
            label: field.label,
            values: [...bucket]
              .map(([value, count]) => ({
                value,
                label: field.choices?.find((c) => c.value === value)?.label ?? value,
                count,
              }))
              .sort((a, b) => order(a.value) - order(b.value)),
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
}
