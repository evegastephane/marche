import { Injectable } from '@nestjs/common';
import {
  type AttributeValueInput,
  categoryPath,
  categoryTracksUnits,
  type CreateAttributeInput,
  type CreateCategoryInput,
  type ReorderAttributeValuesInput,
  resolveCategoryAttributes,
  type SetCategoryAttributesInput,
  slugify,
  type TaxonomyCategory,
  type UpdateAttributeInput,
  type UpdateAttributeValueInput,
  type UpdateCategoryInput,
} from '@marche/contracts';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { Attribute } from '../domain/attribute.aggregate.js';
import { TaxonomyRepository, type TaxonomySnapshot } from '../domain/catalog.repositories.js';
import { Category, InvalidCategoryError } from '../domain/category.aggregate.js';
import type { CategoryContext } from '../domain/product.aggregate.js';
import { CatalogTemplateUseCases } from './catalog-template.use-cases.js';

/** Slug libre : « casques », puis « casques-2 »… */
async function freeSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let attempt = 2; attempt < 100; attempt++) {
    const candidate = `${root.slice(0, 55)}-${attempt}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new ValidationError('SLUG_TAKEN', `Aucun identifiant libre pour « ${base} »`);
}

/**
 * Lecture du catalogue dynamique pour les autres cas d'usage : l'arbre actif de la boutique
 * (posé au premier accès) et le contexte d'une catégorie (attributs hérités, suivi à l'unité).
 */
@Injectable()
export class TaxonomyContextService {
  constructor(
    private readonly taxonomy: TaxonomyRepository,
    private readonly templates: CatalogTemplateUseCases,
  ) {}

  async snapshot(): Promise<TaxonomySnapshot> {
    await this.templates.ensureInstalled();
    return this.taxonomy.snapshot();
  }

  /** Contexte d'une catégorie active ; lève INVALID_CATEGORY si elle n'existe pas ou est archivée. */
  async contextFor(categoryId: string, snapshot?: TaxonomySnapshot): Promise<CategoryContext> {
    const tree = snapshot ?? (await this.snapshot());
    if (!tree.categories.some((category) => category.id === categoryId)) {
      throw new InvalidCategoryError('Catégorie introuvable ou archivée', 'categoryId');
    }
    return {
      categoryId,
      attributes: resolveCategoryAttributes(categoryId, tree.categories, tree.attributes, tree.links),
      tracksUnits: categoryTracksUnits(categoryId, tree.categories),
    };
  }
}

/** Suivi à l'unité effectif de chaque catégorie de l'arbre. */
function trackingMap(tree: readonly TaxonomyCategory[]): Map<string, boolean> {
  return new Map(tree.map((category) => [category.id, categoryTracksUnits(category.id, tree)]));
}

/** Création, modification, rangement et archivage des catégories ; attributs propres à chacune. */
@Injectable()
export class CategoryUseCases {
  constructor(
    private readonly taxonomy: TaxonomyRepository,
    private readonly context: TaxonomyContextService,
    private readonly templates: CatalogTemplateUseCases,
    private readonly inventory: InventoryFacade,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async create(input: CreateCategoryInput): Promise<string> {
    return this.uow.run(async () => {
      const tree = (await this.context.snapshot()).categories;
      const slug = input.slug ?? (await freeSlug(input.name, (candidate) => this.taxonomy.categorySlugExists(candidate)));
      const category = Category.create(this.actor.storeId, { ...input, slug }, tree, this.clock.now());
      await this.taxonomy.insertCategory(category);
      await this.outbox.addAll(category.pullEvents());
      return category.id;
    });
  }

  /**
   * Renommage, déplacement, suivi à l'unité. Si le suivi effectif de sous-catégories change,
   * leurs articles changent de mode de stock : possible seulement s'ils n'ont pas de stock.
   */
  async update(id: string, input: UpdateCategoryInput): Promise<void> {
    await this.uow.run(async () => {
      const category = await this.taxonomy.findCategory(id);
      if (!category || category.isArchived) throw new NotFoundError('Catégorie', id);
      const tree = (await this.context.snapshot()).categories;
      const before = trackingMap(tree);
      category.update(input, tree, this.clock.now());
      const next = category.snapshot();
      const after = trackingMap(
        tree.map((c) => (c.id === id ? { ...c, parentId: next.parentId, tracksUnits: next.tracksUnits, name: next.name, slug: next.slug } : c)),
      );
      await this.taxonomy.updateCategory(category);
      for (const tracks of [true, false]) {
        const changed = [...after.entries()].filter(([cid, value]) => value === tracks && before.get(cid) !== tracks).map(([cid]) => cid);
        const variantIds = await this.taxonomy.variantIdsInCategories(changed);
        await this.inventory.setTracking(variantIds, tracks);
      }
      await this.outbox.addAll(category.pullEvents());
    });
  }

  async archive(id: string): Promise<void> {
    await this.uow.run(async () => {
      const category = await this.taxonomy.findCategory(id);
      if (!category) throw new NotFoundError('Catégorie', id);
      category.archive(await this.taxonomy.categoryUsage(id), this.clock.now());
      await this.taxonomy.updateCategory(category);
      await this.outbox.addAll(category.pullEvents());
    });
  }

  async restore(id: string): Promise<void> {
    await this.uow.run(async () => {
      const category = await this.taxonomy.findCategory(id);
      if (!category) throw new NotFoundError('Catégorie', id);
      category.restore((await this.context.snapshot()).categories, this.clock.now());
      await this.taxonomy.updateCategory(category);
      await this.outbox.addAll(category.pullEvents());
    });
  }

  /** Attributs propres à la catégorie, dans l'ordre donné (les attributs doivent être actifs). */
  async setAttributes(id: string, input: SetCategoryAttributesInput): Promise<void> {
    await this.uow.run(async () => {
      const category = await this.taxonomy.findCategory(id);
      if (!category || category.isArchived) throw new NotFoundError('Catégorie', id);
      const { attributes } = await this.context.snapshot();
      const active = new Set(attributes.map((attribute) => attribute.id));
      const unknown = input.attributes.find((link) => !active.has(link.attributeId));
      if (unknown) {
        throw new ValidationError('VALIDATION_FAILED', 'Attribut introuvable ou archivé', { field: 'attributes', id: unknown.attributeId });
      }
      await this.taxonomy.replaceCategoryAttributes(
        id,
        input.attributes.map((link, position) => ({ attributeId: link.attributeId, required: link.required, position })),
      );
      category.update({}, [], this.clock.now());
      await this.taxonomy.updateCategory(category);
      await this.outbox.addAll(category.pullEvents());
    });
  }

  /** Réinstalle ce qui manque du catalogue de départ (rien n'est écrasé). */
  installTemplate() {
    return this.templates.install();
  }

  /** Chemin d'une catégorie active (racine → catégorie). */
  async path(id: string): Promise<TaxonomyCategory[]> {
    const tree = (await this.context.snapshot()).categories;
    if (!tree.some((category) => category.id === id)) throw new NotFoundError('Catégorie', id);
    return categoryPath(id, tree);
  }
}

/** Création et modification des attributs et de leurs valeurs. */
@Injectable()
export class AttributeUseCases {
  constructor(
    private readonly taxonomy: TaxonomyRepository,
    private readonly templates: CatalogTemplateUseCases,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  /** Crée l'attribut, et le rattache si demandé à une catégorie (à la fin de ses attributs). */
  async create(input: CreateAttributeInput): Promise<string> {
    await this.templates.ensureInstalled();
    return this.uow.run(async () => {
      const slug = input.slug ?? (await freeSlug(input.name, (candidate) => this.taxonomy.attributeSlugExists(candidate)));
      if (input.slug && (await this.taxonomy.attributeSlugExists(input.slug))) {
        throw new ValidationError('SLUG_TAKEN', `L’attribut « ${input.slug} » existe déjà`, { field: 'slug' });
      }
      const attribute = Attribute.create(
        this.actor.storeId,
        {
          name: input.name,
          slug,
          type: input.type,
          unit: input.unit ?? null,
          isVariantAxis: input.isVariantAxis,
          ...(input.filterable !== undefined ? { filterable: input.filterable } : {}),
          values: input.values,
        },
        this.clock.now(),
      );
      await this.taxonomy.insertAttribute(attribute);
      if (input.categoryId) {
        const snapshot = await this.taxonomy.snapshot();
        if (!snapshot.categories.some((category) => category.id === input.categoryId)) {
          throw new InvalidCategoryError('Catégorie introuvable ou archivée', 'categoryId');
        }
        const own = snapshot.links
          .filter((link) => link.categoryId === input.categoryId)
          .sort((a, b) => a.position - b.position)
          .map((link, position) => ({ attributeId: link.attributeId, required: link.required, position }));
        await this.taxonomy.replaceCategoryAttributes(input.categoryId, [
          ...own,
          { attributeId: attribute.id, required: input.required, position: own.length },
        ]);
      }
      await this.outbox.addAll(attribute.pullEvents());
      return attribute.id;
    });
  }

  async update(id: string, input: UpdateAttributeInput): Promise<void> {
    await this.mutate(id, async (attribute) => {
      const changesNature =
        (input.type !== undefined && input.type !== attribute.type) ||
        (input.isVariantAxis !== undefined && input.isVariantAxis !== attribute.isVariantAxis);
      const inUse = changesNature ? await this.taxonomy.attributeInUse(attribute.slug) : false;
      attribute.update(input, inUse, this.clock.now());
    });
  }

  async archive(id: string): Promise<void> {
    await this.mutate(id, (attribute) => attribute.archive(this.clock.now()));
  }

  async restore(id: string): Promise<void> {
    await this.mutate(id, (attribute) => attribute.restore(this.clock.now()));
  }

  async addValue(id: string, input: AttributeValueInput): Promise<void> {
    await this.mutate(id, (attribute) => {
      attribute.addValue(input, this.clock.now());
    });
  }

  /** Un renommage est répercuté sur les produits, variantes et photos qui portent la valeur. */
  async updateValue(id: string, valueId: string, input: UpdateAttributeValueInput): Promise<void> {
    await this.mutate(id, async (attribute) => {
      const { renamedFrom, value } = attribute.updateValue(valueId, input, this.clock.now());
      return renamedFrom ? () => this.taxonomy.renameValue(attribute, renamedFrom, value.value) : undefined;
    });
  }

  async removeValue(id: string, valueId: string): Promise<void> {
    await this.mutate(id, async (attribute) => {
      const current = attribute.snapshot().values.find((value) => value.id === valueId);
      if (!current) throw new NotFoundError('Valeur', valueId);
      attribute.removeValue(valueId, await this.taxonomy.valueInUse(attribute.slug, current.value), this.clock.now());
    });
  }

  async reorderValues(id: string, input: ReorderAttributeValuesInput): Promise<void> {
    await this.mutate(id, (attribute) => attribute.reorderValues(input.valueIds, this.clock.now()));
  }

  /** Charge, modifie, enregistre ; l'action peut demander un traitement après l'enregistrement. */
  private async mutate(
    id: string,
    change: (attribute: Attribute) => void | Promise<void | (() => Promise<void>) | undefined>,
  ): Promise<void> {
    await this.uow.run(async () => {
      const attribute = await this.taxonomy.findAttribute(id);
      if (!attribute) throw new NotFoundError('Attribut', id);
      const after = await change(attribute);
      await this.taxonomy.updateAttribute(attribute);
      if (after) await after();
      await this.outbox.addAll(attribute.pullEvents());
    });
  }
}

