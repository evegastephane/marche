import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { combinationKey } from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { ConflictError } from '../../../shared/domain/domain-error.js';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { Attribute } from '../domain/attribute.aggregate.js';
import type { CatalogTemplate } from '../domain/catalog-templates/catalog-template.js';
import { CatalogTemplateInstaller, TaxonomyRepository, type TaxonomySnapshot } from '../domain/catalog.repositories.js';
import { Category } from '../domain/category.aggregate.js';
import { applyCatalogTemplate } from './catalog-template.writer.js';
import { parseVariantOptions } from './prisma-catalog.repositories.js';

class SlugConflictError extends ConflictError {
  constructor(what: string, slug: string) {
    super('SLUG_TAKEN', `${what} « ${slug} » existe déjà`, { slug });
  }
}

const excluding = (excludeId?: string) => (excludeId ? { id: { not: excludeId } } : {});

const attributeInclude = { values: { orderBy: { position: 'asc' } } } satisfies Prisma.AttributeInclude;
type AttributeRow = Prisma.AttributeGetPayload<{ include: typeof attributeInclude }>;

function attributeToDomain(row: AttributeRow): Attribute {
  return Attribute.reconstitute(row.id, {
    storeId: row.storeId,
    name: row.name,
    slug: row.slug,
    type: row.type,
    unit: row.unit,
    isVariantAxis: row.isVariantAxis,
    filterable: row.filterable,
    position: row.position,
    values: row.values.map((value) => ({
      id: value.id,
      value: value.value,
      code: value.code,
      swatch: value.swatch,
      position: value.position,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  });
}

@Injectable()
export class PrismaTaxonomyRepository extends TaxonomyRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async snapshot(): Promise<TaxonomySnapshot> {
    const [categories, attributes, links] = await Promise.all([
      this.txHost.tx.category.findMany({
        where: { archivedAt: null },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, parentId: true, name: true, slug: true, tracksUnits: true },
      }),
      this.txHost.tx.attribute.findMany({
        where: { archivedAt: null },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        include: attributeInclude,
      }),
      this.txHost.tx.categoryAttribute.findMany({
        where: { category: { archivedAt: null }, attribute: { archivedAt: null } },
        select: { categoryId: true, attributeId: true, required: true, position: true },
      }),
    ]);
    return {
      categories,
      attributes: attributes.map((row) => ({
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
    };
  }

  // ───────────── Catégories ─────────────

  async findCategory(id: string): Promise<Category | null> {
    const row = await this.txHost.tx.category.findUnique({ where: { id } });
    return row
      ? Category.reconstitute(row.id, {
          storeId: row.storeId,
          parentId: row.parentId,
          name: row.name,
          slug: row.slug,
          position: row.position,
          tracksUnits: row.tracksUnits,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          archivedAt: row.archivedAt,
        })
      : null;
  }

  async categorySlugExists(slug: string, excludeId?: string): Promise<boolean> {
    return (await this.txHost.tx.category.count({ where: { slug, ...excluding(excludeId) } })) > 0;
  }

  async categoryUsage(id: string): Promise<{ products: number; children: number }> {
    const [products, children] = await Promise.all([
      this.txHost.tx.product.count({ where: { categoryId: id, archivedAt: null } }),
      this.txHost.tx.category.count({ where: { parentId: id, archivedAt: null } }),
    ]);
    return { products, children };
  }

  async insertCategory(category: Category): Promise<void> {
    const c = category.snapshot();
    try {
      await this.txHost.tx.category.create({ data: { id: category.id, ...c } });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugConflictError('La catégorie', c.slug);
      throw error;
    }
  }

  async updateCategory(category: Category): Promise<void> {
    const { storeId: _storeId, createdAt: _createdAt, ...data } = category.snapshot();
    try {
      await this.txHost.tx.category.update({ where: { id: category.id }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugConflictError('La catégorie', data.slug);
      throw error;
    }
    category.markPersisted();
  }

  async replaceCategoryAttributes(
    categoryId: string,
    links: readonly { attributeId: string; required: boolean; position: number }[],
  ): Promise<void> {
    await this.txHost.tx.categoryAttribute.deleteMany({ where: { categoryId } });
    if (links.length === 0) return;
    await this.txHost.tx.categoryAttribute.createMany({
      data: links.map((link) => ({ ...link, categoryId, storeId: this.actor.storeId })),
    });
  }

  async variantIdsInCategories(categoryIds: readonly string[]): Promise<string[]> {
    if (categoryIds.length === 0) return [];
    const rows = await this.txHost.tx.productVariant.findMany({
      where: { archivedAt: null, product: { categoryId: { in: [...categoryIds] } } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  // ───────────── Attributs ─────────────

  async findAttribute(id: string): Promise<Attribute | null> {
    const row = await this.txHost.tx.attribute.findUnique({ where: { id }, include: attributeInclude });
    return row ? attributeToDomain(row) : null;
  }

  async attributeSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    return (await this.txHost.tx.attribute.count({ where: { slug, ...excluding(excludeId) } })) > 0;
  }

  async attributeInUse(slug: string): Promise<boolean> {
    const storeId = this.actor.storeId;
    const [row] = await this.txHost.tx.$queryRaw<{ used: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM products WHERE store_id = ${storeId}::uuid AND specs ? ${slug})
          OR EXISTS (SELECT 1 FROM product_variants WHERE store_id = ${storeId}::uuid AND options ? ${slug}) AS used`;
    return row?.used ?? false;
  }

  async valueInUse(slug: string, value: string): Promise<boolean> {
    const storeId = this.actor.storeId;
    const [row] = await this.txHost.tx.$queryRaw<{ used: boolean }[]>`
      SELECT EXISTS (
               SELECT 1 FROM products WHERE store_id = ${storeId}::uuid
                AND (specs @> jsonb_build_object(${slug}::text, ${value}::text)
                  OR specs @> jsonb_build_object(${slug}::text, jsonb_build_array(${value}::text)))
             )
          OR EXISTS (
               SELECT 1 FROM product_variants WHERE store_id = ${storeId}::uuid
                AND options @> jsonb_build_object(${slug}::text, ${value}::text)
             ) AS used`;
    return row?.used ?? false;
  }

  async insertAttribute(attribute: Attribute): Promise<void> {
    const { values, ...data } = attribute.snapshot();
    try {
      await this.txHost.tx.attribute.create({ data: { id: attribute.id, ...data } });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SlugConflictError('L’attribut', data.slug);
      throw error;
    }
    if (values.length > 0) {
      await this.txHost.tx.attributeValue.createMany({
        data: values.map((value) => ({ ...value, attributeId: attribute.id, storeId: this.actor.storeId })),
      });
    }
  }

  async updateAttribute(attribute: Attribute): Promise<void> {
    const { values, storeId: _storeId, createdAt: _createdAt, slug: _slug, ...data } = attribute.snapshot();
    await this.txHost.tx.attribute.update({ where: { id: attribute.id }, data });
    const kept = values.map((value) => value.id);
    await this.txHost.tx.attributeValue.deleteMany({ where: { attributeId: attribute.id, id: { notIn: kept } } });
    for (const value of values) {
      const { id, ...fields } = value;
      await this.txHost.tx.attributeValue.upsert({
        where: { id },
        create: { id, ...fields, attributeId: attribute.id, storeId: this.actor.storeId },
        update: fields,
      });
    }
    attribute.markPersisted();
  }

  /**
   * Renommage d'une valeur : fiches techniques (liste simple ou multiple), options des variantes
   * (clé de combinaison et libellé recalculés) et photos associées à la valeur. Le verrou optimiste
   * des produits touchés avance, pour qu'un formulaire ouvert ne réécrive pas l'ancien libellé.
   */
  async renameValue(attribute: Attribute, from: string, to: string): Promise<void> {
    const storeId = this.actor.storeId;
    const slug = attribute.slug;
    if (attribute.type === 'SELECT') {
      await this.txHost.tx.$executeRaw`
        UPDATE products
        SET specs = jsonb_set(specs, ARRAY[${slug}::text], to_jsonb(${to}::text)), version = version + 1, updated_at = now()
        WHERE store_id = ${storeId}::uuid AND specs ->> ${slug} = ${from}`;
    }
    if (attribute.type === 'MULTI_SELECT') {
      await this.txHost.tx.$executeRaw`
        UPDATE products
        SET specs = jsonb_set(
              specs,
              ARRAY[${slug}::text],
              (SELECT COALESCE(jsonb_agg(CASE WHEN item = ${from} THEN ${to} ELSE item END), '[]'::jsonb)
                 FROM jsonb_array_elements_text(specs -> ${slug}) AS item)
            ),
            version = version + 1,
            updated_at = now()
        WHERE store_id = ${storeId}::uuid AND specs -> ${slug} ? ${from}`;
    }
    if (!attribute.isVariantAxis) return;

    const variants = await this.txHost.tx.productVariant.findMany({
      where: { options: { path: [slug], equals: from } },
      select: { id: true, productId: true, options: true, title: true },
    });
    for (const variant of variants) {
      const options = { ...parseVariantOptions(variant.options), [slug]: to };
      await this.txHost.tx.productVariant.update({
        where: { id: variant.id },
        data: {
          options,
          combinationKey: combinationKey(options),
          title: variant.title
            .split(' / ')
            .map((part) => (part === from ? to : part))
            .join(' / '),
        },
      });
    }
    const productIds = [...new Set(variants.map((variant) => variant.productId))];
    if (productIds.length === 0) return;
    await this.txHost.tx.productMedia.updateMany({
      where: { productId: { in: productIds }, optionValue: from },
      data: { optionValue: to },
    });
    await this.txHost.tx.product.updateMany({
      where: { id: { in: productIds } },
      data: { version: { increment: 1 } },
    });
  }
}

@Injectable()
export class PrismaCatalogTemplateInstaller extends CatalogTemplateInstaller {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async hasCategories(): Promise<boolean> {
    return (await this.txHost.tx.category.count({ take: 1 })) > 0;
  }

  async install(template: CatalogTemplate) {
    const plan = await applyCatalogTemplate(this.txHost.tx, this.actor.storeId, template);
    return {
      categories: plan.categories.length,
      attributes: plan.attributes.length,
      values: plan.values.length,
      links: plan.links.length,
    };
  }
}
