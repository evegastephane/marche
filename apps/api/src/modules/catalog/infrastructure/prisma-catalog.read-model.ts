import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type {
  BrandDto,
  BrandListQuery,
  BundleDto,
  BundleProductDto,
  CollectionDetailDto,
  CollectionDto,
  CollectionListQuery,
  MediaDto,
  Paginated,
  ProductDto,
  ProductListItemDto,
  ProductListQuery,
} from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { decodeCursor, toPage } from '../../../shared/application/pagination.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { MediaFacade } from '../../media/media.facade.js';
import { CatalogReadModel } from '../application/catalog.read-model.js';
import { parseAttributesJson, parseKind, parseOptions, parseStringArray } from './prisma-catalog.repositories.js';

const listItemInclude = {
  brand: { select: { id: true, name: true } },
  variants: { where: { archivedAt: null }, select: { priceAmount: true } },
  media: { orderBy: { position: 'asc' }, take: 1, select: { mediaId: true } },
} satisfies Prisma.ProductInclude;

type ListItemRow = Prisma.ProductGetPayload<{ include: typeof listItemInclude }>;

const bundleProductSelect = {
  id: true,
  title: true,
  status: true,
  variants: { where: { archivedAt: null }, select: { priceAmount: true } },
  media: { orderBy: { position: 'asc' }, take: 1, select: { mediaId: true } },
} satisfies Prisma.ProductSelect;

const bundleInclude = {
  anchor: { select: bundleProductSelect },
  items: { orderBy: { position: 'asc' }, include: { product: { select: bundleProductSelect } } },
} satisfies Prisma.BundleInclude;

type BundleRow = Prisma.BundleGetPayload<{ include: typeof bundleInclude }>;
type BundleProductRow = Prisma.ProductGetPayload<{ select: typeof bundleProductSelect }>;

function toBundleProduct(row: BundleProductRow, media: Map<string, MediaDto>): BundleProductDto {
  const thumbnailId = row.media[0]?.mediaId;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    thumbnail: (thumbnailId && media.get(thumbnailId)) || null,
    priceMinAmount: row.variants.length ? Math.min(...row.variants.map((v) => v.priceAmount)) : 0,
  };
}

function toListItem(row: ListItemRow, media: Map<string, MediaDto>): ProductListItemDto {
  const prices = row.variants.map((variant) => variant.priceAmount);
  const thumbnailId = row.media[0]?.mediaId;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    kind: parseKind(row.kind),
    brand: row.brand,
    variantsCount: row.variants.length,
    priceMinAmount: prices.length ? Math.min(...prices) : 0,
    priceMaxAmount: prices.length ? Math.max(...prices) : 0,
    thumbnail: (thumbnailId && media.get(thumbnailId)) || null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PrismaCatalogReadModel extends CatalogReadModel {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly media: MediaFacade,
    private readonly inventory: InventoryFacade,
  ) {
    super();
  }

  async listProducts(query: ProductListQuery): Promise<Paginated<ProductListItemDto>> {
    const and: Prisma.ProductWhereInput[] = [
      query.status ? { status: query.status } : { status: { not: 'ARCHIVED' } },
    ];
    if (query.brandId) and.push({ brandId: query.brandId });
    if (query.kind) and.push({ kind: query.kind });
    if (query.collectionId) and.push({ collections: { some: { collectionId: query.collectionId } } });
    if (query.q) {
      and.push({
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { variants: { some: { sku: { equals: query.q, mode: 'insensitive' } } } },
        ],
      });
    }
    if (query.cursor) {
      const [updatedAt, id] = decodeCursor(query.cursor, 2);
      const date = new Date(String(updatedAt));
      and.push({ OR: [{ updatedAt: { lt: date } }, { updatedAt: date, id: { lt: String(id) } }] });
    }
    const rows = await this.txHost.tx.product.findMany({
      where: { AND: and },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: listItemInclude,
    });
    const page = toPage(rows, query.limit, (row) => [row.updatedAt.toISOString(), row.id]);
    const media = await this.media.getMany(page.items.flatMap((row) => row.media.map((m) => m.mediaId)));
    return { items: page.items.map((row) => toListItem(row, media)), nextCursor: page.nextCursor };
  }

  async getProduct(id: string): Promise<ProductDto | null> {
    const row = await this.txHost.tx.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true } },
        variants: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
        media: { orderBy: { position: 'asc' }, select: { mediaId: true, optionValue: true } },
        collections: { include: { collection: { select: { id: true, title: true } } } },
        relations: {
          where: { type: 'ACCESSORY' },
          orderBy: { position: 'asc' },
          include: {
            related: {
              select: {
                id: true,
                title: true,
                status: true,
                media: { orderBy: { position: 'asc' }, take: 1, select: { mediaId: true } },
              },
            },
          },
        },
      },
    });
    if (!row) return null;
    const accessoryMediaIds = row.relations.flatMap((r) => r.related.media.map((m) => m.mediaId));
    const [media, stock] = await Promise.all([
      this.media.getMany([...row.media.map((m) => m.mediaId), ...accessoryMediaIds]),
      this.inventory.summaries(row.variants.map((variant) => variant.id)),
    ]);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      status: row.status,
      brand: row.brand,
      kind: parseKind(row.kind),
      attributes: parseAttributesJson(row.attributes),
      options: parseOptions(row.options),
      variants: row.variants.map((variant) => {
        const optionValues = parseStringArray(variant.optionValues);
        return {
          id: variant.id,
          sku: variant.sku,
          title: optionValues.length ? optionValues.join(' / ') : 'Par défaut',
          optionValues,
          priceAmount: variant.priceAmount,
          compareAtAmount: variant.compareAtAmount,
          position: variant.position,
          trackInventory: variant.trackInventory,
          archived: false,
          inventory: stock.get(variant.id) ?? null,
        };
      }),
      media: row.media.flatMap((m) => {
        const dto = media.get(m.mediaId);
        return dto ? [dto] : [];
      }),
      mediaOptionValues: Object.fromEntries(
        row.media.flatMap((m) => (m.optionValue ? [[m.mediaId, m.optionValue]] : [])),
      ),
      accessories: row.relations.map(({ related }) => {
        const thumbnailId = related.media[0]?.mediaId;
        return {
          id: related.id,
          title: related.title,
          status: related.status,
          thumbnail: (thumbnailId && media.get(thumbnailId)) || null,
        };
      }),
      collections: row.collections.map((link) => link.collection),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listBrands(query: BrandListQuery): Promise<Paginated<BrandDto>> {
    const and: Prisma.BrandWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.q) and.push({ name: { contains: query.q, mode: 'insensitive' } });
    if (query.cursor) {
      const [name, id] = decodeCursor(query.cursor, 2);
      and.push({ OR: [{ name: { gt: String(name) } }, { name: String(name), id: { gt: String(id) } }] });
    }
    const rows = await this.txHost.tx.brand.findMany({
      where: { AND: and },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      include: { _count: { select: { products: { where: { status: { not: 'ARCHIVED' } } } } } },
    });
    const page = toPage(rows, query.limit, (row) => [row.name, row.id]);
    const logos = await this.media.getMany(
      page.items.map((row) => row.logoMediaId).filter((id): id is string => id !== null),
    );
    return { items: page.items.map((row) => this.toBrandDto(row, logos)), nextCursor: page.nextCursor };
  }

  async getBrand(id: string): Promise<BrandDto | null> {
    const row = await this.txHost.tx.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: { where: { status: { not: 'ARCHIVED' } } } } } },
    });
    if (!row) return null;
    const logos = await this.media.getMany(row.logoMediaId ? [row.logoMediaId] : []);
    return this.toBrandDto(row, logos);
  }

  async listCollections(query: CollectionListQuery): Promise<Paginated<CollectionDto>> {
    const and: Prisma.CollectionWhereInput[] = [];
    if (query.q) and.push({ title: { contains: query.q, mode: 'insensitive' } });
    if (query.cursor) {
      const [position, id] = decodeCursor(query.cursor, 2);
      and.push({
        OR: [{ position: { gt: Number(position) } }, { position: Number(position), id: { gt: String(id) } }],
      });
    }
    const rows = await this.txHost.tx.collection.findMany({
      where: { AND: and },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      include: { _count: { select: { products: true } } },
    });
    const page = toPage(rows, query.limit, (row) => [row.position, row.id]);
    const images = await this.media.getMany(
      page.items.map((row) => row.imageMediaId).filter((id): id is string => id !== null),
    );
    return { items: page.items.map((row) => this.toCollectionDto(row, images)), nextCursor: page.nextCursor };
  }

  async getCollection(id: string): Promise<CollectionDetailDto | null> {
    const row = await this.txHost.tx.collection.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        products: { orderBy: { position: 'asc' }, include: { product: { include: listItemInclude } } },
      },
    });
    if (!row) return null;
    const media = await this.media.getMany([
      ...(row.imageMediaId ? [row.imageMediaId] : []),
      ...row.products.flatMap((link) => link.product.media.map((m) => m.mediaId)),
    ]);
    return {
      ...this.toCollectionDto(row, media),
      products: row.products.map((link) => toListItem(link.product, media)),
    };
  }

  async listBundles(filter: { anchorProductId?: string }): Promise<BundleDto[]> {
    const rows = await this.txHost.tx.bundle.findMany({
      where: filter.anchorProductId ? { anchorProductId: filter.anchorProductId } : {},
      include: bundleInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    return this.toBundleDtos(rows);
  }

  async getBundle(id: string): Promise<BundleDto | null> {
    const row = await this.txHost.tx.bundle.findUnique({ where: { id }, include: bundleInclude });
    return row ? ((await this.toBundleDtos([row]))[0] ?? null) : null;
  }

  private async toBundleDtos(rows: BundleRow[]): Promise<BundleDto[]> {
    const media = await this.media.getMany(
      rows.flatMap((row) => [row.anchor, ...row.items.map((item) => item.product)].flatMap((p) => p.media.map((m) => m.mediaId))),
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      anchor: toBundleProduct(row.anchor, media),
      items: row.items.map((item) => toBundleProduct(item.product, media)),
      discountType: row.discountType,
      discountValue: row.discountValue,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private toBrandDto(
    row: Prisma.BrandGetPayload<{ include: { _count: { select: { products: true } } } }>,
    logos: Map<string, MediaDto>,
  ): BrandDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logo: (row.logoMediaId && logos.get(row.logoMediaId)) || null,
      productsCount: row._count.products,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toCollectionDto(
    row: Prisma.CollectionGetPayload<{ include: { _count: { select: { products: true } } } }>,
    images: Map<string, MediaDto>,
  ): CollectionDto {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      image: (row.imageMediaId && images.get(row.imageMediaId)) || null,
      isPublished: row.isPublished,
      position: row.position,
      productsCount: row._count.products,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
