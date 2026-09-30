import type { Prisma } from '../../../generated/prisma/client.js';
import { newId } from '../../../shared/domain/id.js';
import type { CatalogTemplate } from '../domain/catalog-templates/catalog-template.js';
import { isEmptyPlan, planTemplate, type TemplatePlan } from '../domain/catalog-templates/plan-template.js';

/**
 * Ce que le gabarit demande à Prisma : le client de l'API (étendu, en transaction), celui du seed
 * et celui du script de reprise y répondent tous.
 */
export interface TaxonomyDb {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): PromiseLike<number>;
  category: {
    findMany(args: { where: { storeId: string }; select: { id: true; slug: true } }): PromiseLike<{ id: string; slug: string }[]>;
    createMany(args: { data: Prisma.CategoryCreateManyInput[] }): PromiseLike<unknown>;
  };
  attribute: {
    findMany(args: {
      where: { storeId: string };
      select: { id: true; slug: true; values: { select: { value: true } } };
    }): PromiseLike<{ id: string; slug: string; values: { value: string }[] }[]>;
    createMany(args: { data: Prisma.AttributeCreateManyInput[] }): PromiseLike<unknown>;
  };
  attributeValue: { createMany(args: { data: Prisma.AttributeValueCreateManyInput[] }): PromiseLike<unknown> };
  categoryAttribute: {
    findMany(args: {
      where: { storeId: string };
      select: { categoryId: true; attributeId: true };
    }): PromiseLike<{ categoryId: string; attributeId: string }[]>;
    createMany(args: { data: Prisma.CategoryAttributeCreateManyInput[] }): PromiseLike<unknown>;
  };
}

/**
 * Applique un gabarit à une boutique, dans la transaction de l'appelant. Un verrou consultatif
 * par boutique sérialise deux applications simultanées (création de boutique et première visite).
 */
export async function applyCatalogTemplate(
  db: TaxonomyDb,
  storeId: string,
  template: CatalogTemplate,
): Promise<TemplatePlan> {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`catalog-template:${storeId}`}, 0))`;
  const [categories, attributes, links] = await Promise.all([
    db.category.findMany({ where: { storeId }, select: { id: true, slug: true } }),
    db.attribute.findMany({
      where: { storeId },
      select: { id: true, slug: true, values: { select: { value: true } } },
    }),
    db.categoryAttribute.findMany({ where: { storeId }, select: { categoryId: true, attributeId: true } }),
  ]);
  const plan = planTemplate(template, { categories, attributes, links }, newId);
  if (isEmptyPlan(plan)) return plan;

  if (plan.attributes.length > 0) {
    await db.attribute.createMany({ data: plan.attributes.map((row) => ({ ...row, storeId })) });
  }
  if (plan.values.length > 0) {
    await db.attributeValue.createMany({ data: plan.values.map((row) => ({ ...row, storeId })) });
  }
  // Parents avant enfants : l'ordre du plan suit l'arbre, la clé étrangère est satisfaite ligne à ligne.
  if (plan.categories.length > 0) {
    await db.category.createMany({ data: plan.categories.map((row) => ({ ...row, storeId })) });
  }
  if (plan.links.length > 0) {
    await db.categoryAttribute.createMany({ data: plan.links.map((row) => ({ ...row, storeId })) });
  }
  return plan;
}
