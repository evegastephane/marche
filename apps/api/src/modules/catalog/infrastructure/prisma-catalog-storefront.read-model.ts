import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type {
  MediaDto,
  Paginated,
  StorefrontBrandDto,
  StorefrontCollectionDto,
  StorefrontProductCardDto,
  StorefrontProductDto,
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
import { parseOptions, parseStringArray } from './prisma-catalog.repositories.js';

interface CardRow {
  id: string;
  title: string;
  slug: string;
  brand_name: string | null;
  brand_slug: string | null;
  price_min: number;
  price_max: number;
  compare_at: number | null;
  media_id: string | null;
  sort_key: Date | number;
}

type EffectiveSort = 'position' | 'newest' | 'price-asc' | 'price-desc';

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
            variantTitle: optionValues.length ? optionValues.join(' / ') : 'Par défaut',
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

  async listProductCards(filter: StorefrontProductFilter): Promise<Paginated<StorefrontProductCardDto> | null> {
    let collectionId: string | null = null;
    if (filter.collectionSlug) {
      const collection = await this.txHost.tx.collection.findFirst({
        where: { slug: filter.collectionSlug, isPublished: true },
        select: { id: true },
      });
      if (!collection) return null;
      collectionId = collection.id;
    }
    const sort: EffectiveSort =
      filter.sort === 'featured' ? (collectionId ? 'position' : 'newest') : filter.sort;

    const joinCollection = collectionId
      ? Prisma.sql`JOIN collection_products cp ON cp.product_id = p.id AND cp.collection_id = ${collectionId}::uuid`
      : Prisma.empty;
    const brandFilter = filter.brandSlug ? Prisma.sql`AND b.slug = ${filter.brandSlug}` : Prisma.empty;

    let sortKey: Prisma.Sql;
    let orderBy: Prisma.Sql;
    let whereCursor = Prisma.empty;
    let havingCursor = Prisma.empty;
    const cursor = filter.cursor ? decodeCursor(filter.cursor, 2) : null;
    switch (sort) {
      case 'position':
        sortKey = Prisma.sql`cp.position`;
        orderBy = Prisma.sql`cp.position ASC, p.id ASC`;
        if (cursor) whereCursor = Prisma.sql`AND (cp.position, p.id) > (${Number(cursor[0])}, ${String(cursor[1])}::uuid)`;
        break;
      case 'newest':
        sortKey = Prisma.sql`COALESCE(p.published_at, p.created_at)`;
        orderBy = Prisma.sql`sort_key DESC, p.id DESC`;
        if (cursor) {
          whereCursor = Prisma.sql`AND (COALESCE(p.published_at, p.created_at), p.id) < (${new Date(String(cursor[0]))}, ${String(cursor[1])}::uuid)`;
        }
        break;
      case 'price-asc':
        sortKey = Prisma.sql`MIN(v.price_amount)`;
        orderBy = Prisma.sql`MIN(v.price_amount) ASC, p.id ASC`;
        if (cursor) havingCursor = Prisma.sql`HAVING (MIN(v.price_amount), p.id) > (${Number(cursor[0])}, ${String(cursor[1])}::uuid)`;
        break;
      case 'price-desc':
        sortKey = Prisma.sql`MIN(v.price_amount)`;
        orderBy = Prisma.sql`MIN(v.price_amount) DESC, p.id DESC`;
        if (cursor) havingCursor = Prisma.sql`HAVING (MIN(v.price_amount), p.id) < (${Number(cursor[0])}, ${String(cursor[1])}::uuid)`;
        break;
    }

    const rows = await this.txHost.tx.$queryRaw<CardRow[]>`
      SELECT p.id, p.title, p.slug, b.name AS brand_name, b.slug AS brand_slug,
             MIN(v.price_amount) AS price_min, MAX(v.price_amount) AS price_max,
             (array_agg(v.compare_at_amount ORDER BY v.price_amount, v.position))[1] AS compare_at,
             (SELECT pm.media_id FROM product_media pm WHERE pm.product_id = p.id ORDER BY pm.position LIMIT 1) AS media_id,
             ${sortKey} AS sort_key
      FROM products p
      JOIN product_variants v ON v.product_id = p.id AND v.archived_at IS NULL
      LEFT JOIN brands b ON b.id = p.brand_id AND b.archived_at IS NULL
      ${joinCollection}
      WHERE p.store_id = ${this.actor.storeId}::uuid AND p.status = 'ACTIVE' ${brandFilter} ${whereCursor}
      GROUP BY p.id, b.name, b.slug${collectionId ? Prisma.sql`, cp.position` : Prisma.empty}
      ${havingCursor}
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
      })),
    };
  }

  async getProduct(slug: string): Promise<StorefrontProductDto | null> {
    const row = await this.txHost.tx.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        brand: { select: { name: true, slug: true, archivedAt: true } },
        variants: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
        media: { orderBy: { position: 'asc' }, select: { mediaId: true } },
      },
    });
    if (!row || row.variants.length === 0) return null;
    const media = await this.media.getMany(row.media.map((m) => m.mediaId));
    const images: MediaDto[] = row.media.flatMap((m) => {
      const dto = media.get(m.mediaId);
      return dto && dto.status !== 'FAILED' ? [dto] : [];
    });
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      brand: row.brand && !row.brand.archivedAt ? { name: row.brand.name, slug: row.brand.slug } : null,
      options: parseOptions(row.options),
      variants: row.variants.map((variant) => {
        const optionValues = parseStringArray(variant.optionValues);
        return {
          id: variant.id,
          title: optionValues.length ? optionValues.join(' / ') : 'Par défaut',
          optionValues,
          priceAmount: variant.priceAmount,
          compareAtAmount: variant.compareAtAmount,
          sku: variant.sku,
        };
      }),
      images,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
