import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  categoryPath,
  categoryTracksUnits,
  resolveCategoryAttributes,
  type AttributeDto,
  type AttributeListQuery,
  type CategoryDetailDto,
  type CategoryDto,
  type CategoryListQuery,
} from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { TaxonomyReadModel } from '../application/taxonomy.read-model.js';
import { TaxonomyRepository } from '../domain/catalog.repositories.js';

const categorySelect = {
  id: true,
  parentId: true,
  name: true,
  slug: true,
  position: true,
  tracksUnits: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
} satisfies Prisma.CategorySelect;

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

const attributeInclude = {
  values: { orderBy: { position: 'asc' } },
  categories: {
    where: { category: { archivedAt: null } },
    orderBy: { position: 'asc' },
    select: { required: true, category: { select: { id: true, name: true } } },
  },
} satisfies Prisma.AttributeInclude;

type AttributeRow = Prisma.AttributeGetPayload<{ include: typeof attributeInclude }>;

function toAttributeDto(row: AttributeRow): AttributeDto {
  return {
    id: row.id,
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
    categories: row.categories.map((link) => ({ ...link.category, required: link.required })),
    archived: row.archivedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PrismaTaxonomyReadModel extends TaxonomyReadModel {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly taxonomy: TaxonomyRepository,
  ) {
    super();
  }

  async listCategories(query: CategoryListQuery): Promise<CategoryDto[]> {
    const [rows, counts] = await Promise.all([
      this.txHost.tx.category.findMany({
        where: query.includeArchived ? {} : { archivedAt: null },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: categorySelect,
      }),
      this.productCounts(),
    ]);
    return rows.map((row) => this.toCategoryDto(row, rows, counts));
  }

  async getCategory(id: string): Promise<CategoryDetailDto | null> {
    const [all, counts, snapshot] = await Promise.all([
      this.txHost.tx.category.findMany({ select: categorySelect }),
      this.productCounts(id),
      this.taxonomy.snapshot(),
    ]);
    const row = all.find((category) => category.id === id);
    if (!row) return null;
    const names = new Map(all.map((category) => [category.id, category.name]));
    // Une catégorie archivée garde ses attributs visibles : on résout sur l'arbre complet.
    const attributes = resolveCategoryAttributes(id, all, snapshot.attributes, await this.links());
    return {
      ...this.toCategoryDto(row, all, counts),
      path: categoryPath(id, all).map((category) => ({ id: category.id, name: category.name, slug: category.slug })),
      attributes: attributes.map((attribute) => ({
        id: attribute.id,
        slug: attribute.slug,
        name: attribute.name,
        type: attribute.type,
        unit: attribute.unit,
        isVariantAxis: attribute.isVariantAxis,
        filterable: attribute.filterable,
        required: attribute.required,
        inherited: attribute.inherited,
        source: { id: attribute.sourceCategoryId, name: names.get(attribute.sourceCategoryId) ?? '' },
        values: attribute.values,
      })),
    };
  }

  async listAttributes(query: AttributeListQuery): Promise<AttributeDto[]> {
    const and: Prisma.AttributeWhereInput[] = [];
    if (!query.includeArchived) and.push({ archivedAt: null });
    if (query.q) {
      and.push({ OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q.toLowerCase() } }] });
    }
    const rows = await this.txHost.tx.attribute.findMany({
      where: { AND: and },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: attributeInclude,
    });
    return rows.map(toAttributeDto);
  }

  async getAttribute(id: string): Promise<AttributeDto | null> {
    const row = await this.txHost.tx.attribute.findUnique({ where: { id }, include: attributeInclude });
    return row ? toAttributeDto(row) : null;
  }

  /** Liens vers des attributs actifs, catégories archivées comprises. */
  private links() {
    return this.txHost.tx.categoryAttribute.findMany({
      where: { attribute: { archivedAt: null } },
      select: { categoryId: true, attributeId: true, required: true, position: true },
    });
  }

  /** Produits non archivés rangés directement dans chaque catégorie. */
  private async productCounts(categoryId?: string): Promise<Map<string, number>> {
    const groups = await this.txHost.tx.product.groupBy({
      by: ['categoryId'],
      where: { status: { not: 'ARCHIVED' }, ...(categoryId ? { categoryId } : {}) },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.categoryId, group._count._all]));
  }

  private toCategoryDto(row: CategoryRow, tree: readonly CategoryRow[], counts: Map<string, number>): CategoryDto {
    return {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      slug: row.slug,
      position: row.position,
      tracksUnits: row.tracksUnits,
      tracksUnitsEffective: categoryTracksUnits(row.id, tree),
      productsCount: counts.get(row.id) ?? 0,
      archived: row.archivedAt !== null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
