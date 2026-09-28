import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  OPTION_TYPES,
  type OptionType,
  PRODUCT_KINDS,
  productAttributesSchema,
  type ProductAttributes,
  type ProductKind,
  type ProductOption,
} from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { ConcurrentModificationError } from '../../../shared/domain/domain-error.js';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { Brand } from '../domain/brand.aggregate.js';
import { Bundle, type BundleData } from '../domain/bundle.aggregate.js';
import { SkuTakenError, SlugTakenError } from '../domain/catalog.errors.js';
import {
  BrandRepository,
  BundleRepository,
  CollectionRepository,
  ProductRepository,
} from '../domain/catalog.repositories.js';
import { Collection } from '../domain/collection.aggregate.js';
import { Product } from '../domain/product.aggregate.js';
import { ProductVariant } from '../domain/product-variant.entity.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseOptions(value: Prisma.JsonValue): ProductOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== 'string' || !Array.isArray(item.values)) return [];
    const type = (OPTION_TYPES as readonly string[]).includes(item.type as string) ? (item.type as OptionType) : undefined;
    const swatches = isRecord(item.swatches)
      ? Object.fromEntries(Object.entries(item.swatches).filter(([, hex]) => typeof hex === 'string')) as Record<string, string>
      : undefined;
    return [
      {
        name: item.name,
        values: item.values.map(String),
        ...(type ? { type } : {}),
        ...(swatches && Object.keys(swatches).length > 0 ? { swatches } : {}),
      },
    ];
  });
}

export function parseStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function parseKind(value: string | null): ProductKind | null {
  return value && (PRODUCT_KINDS as readonly string[]).includes(value) ? (value as ProductKind) : null;
}

export function parseAttributesJson(value: Prisma.JsonValue): ProductAttributes {
  const parsed = productAttributesSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

const excluding = (excludeId?: string) => (excludeId ? { id: { not: excludeId } } : {});

// ───────────── Produits ─────────────

const productInclude = {
  variants: { orderBy: { position: 'asc' } },
  media: { orderBy: { position: 'asc' }, select: { mediaId: true, optionValue: true } },
  relations: { where: { type: 'ACCESSORY' }, orderBy: { position: 'asc' }, select: { relatedProductId: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function productToDomain(row: ProductRow): Product {
  return Product.reconstitute(
    row.id,
    {
      storeId: row.storeId,
      brandId: row.brandId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      status: row.status,
      options: parseOptions(row.options),
      variants: row.variants.map((variant) =>
        ProductVariant.reconstitute({
          id: variant.id,
          sku: variant.sku,
          optionValues: parseStringArray(variant.optionValues),
          priceAmount: variant.priceAmount,
          compareAtAmount: variant.compareAtAmount,
          position: variant.position,
          trackInventory: variant.trackInventory,
          archivedAt: variant.archivedAt,
        }),
      ),
      mediaIds: row.media.map((media) => media.mediaId),
      mediaOptionValues: Object.fromEntries(
        row.media.flatMap((media) => (media.optionValue ? [[media.mediaId, media.optionValue]] : [])),
      ),
      kind: parseKind(row.kind),
      attributes: parseAttributesJson(row.attributes),
      accessoryIds: row.relations.map((relation) => relation.relatedProductId),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt,
    },
    row.version,
  );
}

function productFields(product: Product) {
  const p = product.snapshot();
  return {
    brandId: p.brandId,
    title: p.title,
    slug: p.slug,
    description: p.description,
    status: p.status,
    options: p.options as unknown as Prisma.InputJsonValue,
    kind: p.kind,
    attributes: p.attributes as Prisma.InputJsonValue,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    publishedAt: p.publishedAt,
    archivedAt: p.archivedAt,
  };
}

@Injectable()
export class PrismaProductRepository extends ProductRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.txHost.tx.product.findUnique({ where: { id }, include: productInclude });
    return row ? productToDomain(row) : null;
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return (await this.txHost.tx.product.count({ where: { slug, ...excluding(excludeId) } })) > 0;
  }

  async takenSkus(skus: readonly string[], excludeProductId?: string): Promise<string[]> {
    if (skus.length === 0) return [];
    const rows = await this.txHost.tx.productVariant.findMany({
      where: {
        sku: { in: [...new Set(skus)] },
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { sku: true },
    });
    return rows.map((row) => row.sku);
  }

  async existingIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.txHost.tx.product.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async insert(product: Product): Promise<void> {
    const p = product.snapshot();
    try {
      await this.txHost.tx.product.create({
        data: { id: product.id, storeId: p.storeId, createdAt: p.createdAt, ...productFields(product) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugTakenError(p.slug);
      throw error;
    }
    await this.writeVariants(product);
    await this.writeMedia(product, false);
    await this.writeRelations(product, false);
  }

  async update(product: Product): Promise<void> {
    const p = product.snapshot();
    try {
      const { count } = await this.txHost.tx.product.updateMany({
        where: { id: product.id, version: product.version },
        data: { ...productFields(product), version: { increment: 1 } },
      });
      if (count === 0) throw new ConcurrentModificationError('Le produit');
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugTakenError(p.slug);
      throw error;
    }
    await this.writeVariants(product);
    await this.writeMedia(product, true);
    await this.writeRelations(product, true);
    product.markPersisted();
  }

  private async writeVariants(product: Product): Promise<void> {
    const storeId = this.actor.storeId;
    for (const variant of product.variants) {
      const v = variant.snapshot();
      const data = {
        sku: v.sku,
        title: variant.title,
        optionValues: v.optionValues as Prisma.InputJsonValue,
        priceAmount: v.priceAmount,
        compareAtAmount: v.compareAtAmount,
        position: v.position,
        trackInventory: v.trackInventory,
        archivedAt: v.archivedAt,
      };
      try {
        await this.txHost.tx.productVariant.upsert({
          where: { id: v.id },
          create: { id: v.id, storeId, productId: product.id, ...data },
          update: data,
        });
      } catch (error) {
        if (isUniqueViolation(error)) throw new SkuTakenError([v.sku]);
        throw error;
      }
    }
  }

  private async writeMedia(product: Product, replace: boolean): Promise<void> {
    if (replace) await this.txHost.tx.productMedia.deleteMany({ where: { productId: product.id } });
    const { mediaIds, mediaOptionValues } = product.snapshot();
    if (mediaIds.length === 0) return;
    await this.txHost.tx.productMedia.createMany({
      data: mediaIds.map((mediaId, position) => ({
        storeId: this.actor.storeId,
        productId: product.id,
        mediaId,
        position,
        optionValue: mediaOptionValues[mediaId] ?? null,
      })),
    });
  }

  /** Accessoires choisis à la main : réécrits en entier, dans l'ordre du formulaire. */
  private async writeRelations(product: Product, replace: boolean): Promise<void> {
    if (replace) {
      await this.txHost.tx.productRelation.deleteMany({ where: { productId: product.id, type: 'ACCESSORY' } });
    }
    const { accessoryIds } = product.snapshot();
    if (accessoryIds.length === 0) return;
    await this.txHost.tx.productRelation.createMany({
      data: accessoryIds.map((relatedProductId, position) => ({
        storeId: this.actor.storeId,
        productId: product.id,
        relatedProductId,
        type: 'ACCESSORY' as const,
        position,
      })),
    });
  }
}

// ───────────── Marques ─────────────

@Injectable()
export class PrismaBrandRepository extends BrandRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findById(id: string): Promise<Brand | null> {
    const row = await this.txHost.tx.brand.findUnique({ where: { id } });
    return row
      ? Brand.reconstitute(row.id, {
          storeId: row.storeId,
          name: row.name,
          slug: row.slug,
          description: row.description,
          logoMediaId: row.logoMediaId,
          createdAt: row.createdAt,
          archivedAt: row.archivedAt,
        })
      : null;
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return (await this.txHost.tx.brand.count({ where: { slug, ...excluding(excludeId) } })) > 0;
  }

  async isActive(id: string): Promise<boolean> {
    return (await this.txHost.tx.brand.count({ where: { id, archivedAt: null } })) > 0;
  }

  async insert(brand: Brand): Promise<void> {
    const b = brand.snapshot();
    try {
      await this.txHost.tx.brand.create({
        data: {
          id: brand.id,
          storeId: b.storeId,
          name: b.name,
          slug: b.slug,
          description: b.description,
          logoMediaId: b.logoMediaId,
          createdAt: b.createdAt,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugTakenError(b.slug);
      throw error;
    }
  }

  async update(brand: Brand): Promise<void> {
    const b = brand.snapshot();
    try {
      await this.txHost.tx.brand.update({
        where: { id: brand.id },
        data: {
          name: b.name,
          slug: b.slug,
          description: b.description,
          logoMediaId: b.logoMediaId,
          archivedAt: b.archivedAt,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugTakenError(b.slug);
      throw error;
    }
  }
}

// ───────────── Catalogues ─────────────

@Injectable()
export class PrismaCollectionRepository extends CollectionRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async findById(id: string): Promise<Collection | null> {
    const row = await this.txHost.tx.collection.findUnique({
      where: { id },
      include: { products: { orderBy: { position: 'asc' }, select: { productId: true } } },
    });
    return row
      ? Collection.reconstitute(row.id, {
          storeId: row.storeId,
          title: row.title,
          slug: row.slug,
          description: row.description,
          imageMediaId: row.imageMediaId,
          isPublished: row.isPublished,
          position: row.position,
          productIds: row.products.map((product) => product.productId),
          createdAt: row.createdAt,
        })
      : null;
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return (await this.txHost.tx.collection.count({ where: { slug, ...excluding(excludeId) } })) > 0;
  }

  async insert(collection: Collection): Promise<void> {
    const c = collection.snapshot();
    try {
      await this.txHost.tx.collection.create({
        data: {
          id: collection.id,
          storeId: c.storeId,
          title: c.title,
          slug: c.slug,
          description: c.description,
          imageMediaId: c.imageMediaId,
          isPublished: c.isPublished,
          position: c.position,
          createdAt: c.createdAt,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugTakenError(c.slug);
      throw error;
    }
    await this.writeProducts(collection);
  }

  async update(collection: Collection): Promise<void> {
    const c = collection.snapshot();
    try {
      await this.txHost.tx.collection.update({
        where: { id: collection.id },
        data: {
          title: c.title,
          slug: c.slug,
          description: c.description,
          imageMediaId: c.imageMediaId,
          isPublished: c.isPublished,
          position: c.position,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugTakenError(c.slug);
      throw error;
    }
    await this.txHost.tx.collectionProduct.deleteMany({ where: { collectionId: collection.id } });
    await this.writeProducts(collection);
  }

  async delete(collection: Collection): Promise<void> {
    await this.txHost.tx.collection.delete({ where: { id: collection.id } });
  }

  private async writeProducts(collection: Collection): Promise<void> {
    if (collection.productIds.length === 0) return;
    await this.txHost.tx.collectionProduct.createMany({
      data: collection.productIds.map((productId, position) => ({
        storeId: this.actor.storeId,
        collectionId: collection.id,
        productId,
        position,
      })),
    });
  }
}

// ───────────── Packs ─────────────

@Injectable()
export class PrismaBundleRepository extends BundleRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findById(id: string): Promise<Bundle | null> {
    const row = await this.txHost.tx.bundle.findUnique({
      where: { id },
      include: { items: { orderBy: { position: 'asc' }, select: { productId: true } } },
    });
    return row
      ? Bundle.reconstitute(row.id, {
          storeId: row.storeId,
          title: row.title,
          anchorProductId: row.anchorProductId,
          itemProductIds: row.items.map((item) => item.productId),
          discountType: row.discountType,
          discountValue: row.discountValue,
          isActive: row.isActive,
          createdAt: row.createdAt,
        })
      : null;
  }

  async insert(bundle: Bundle): Promise<void> {
    const b = bundle.snapshot();
    await this.txHost.tx.bundle.create({
      data: {
        id: bundle.id,
        storeId: b.storeId,
        title: b.title,
        anchorProductId: b.anchorProductId,
        discountType: b.discountType,
        discountValue: b.discountValue,
        isActive: b.isActive,
        createdAt: b.createdAt,
      },
    });
    await this.writeItems(bundle.id, b);
  }

  async update(bundle: Bundle): Promise<void> {
    const b = bundle.snapshot();
    await this.txHost.tx.bundle.update({
      where: { id: bundle.id },
      data: {
        title: b.title,
        anchorProductId: b.anchorProductId,
        discountType: b.discountType,
        discountValue: b.discountValue,
        isActive: b.isActive,
      },
    });
    await this.txHost.tx.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
    await this.writeItems(bundle.id, b);
  }

  async delete(bundle: Bundle): Promise<void> {
    await this.txHost.tx.bundle.delete({ where: { id: bundle.id } });
  }

  private async writeItems(bundleId: string, b: Readonly<BundleData>): Promise<void> {
    await this.txHost.tx.bundleItem.createMany({
      data: b.itemProductIds.map((productId, position) => ({ storeId: b.storeId, bundleId, productId, position })),
    });
  }
}
