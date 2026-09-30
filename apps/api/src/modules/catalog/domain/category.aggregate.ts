import { categoryPath, MAX_CATEGORY_DEPTH, type TaxonomyCategory } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { Slug } from '../../../shared/domain/slug.vo.js';

export interface CategoryData {
  storeId: string;
  parentId: string | null;
  name: string;
  slug: string;
  position: number;
  tracksUnits: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class InvalidCategoryError extends ValidationError {
  constructor(message: string, field?: string) {
    super('INVALID_CATEGORY', message, field ? { field } : undefined);
  }
}

/** Une catégorie qui porte des produits ou des sous-catégories actives ne s'archive pas. */
export class CategoryInUseError extends ConflictError {
  constructor(message: string) {
    super('CATEGORY_IN_USE', message);
  }
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) throw new InvalidCategoryError('Nom de catégorie requis (80 caractères maximum)', 'name');
  return trimmed;
}

/** Profondeur d'une catégorie (1 = racine) dans l'arbre donné. */
function depthOf(categoryId: string, tree: readonly TaxonomyCategory[]): number {
  return categoryPath(categoryId, tree).length;
}

/** Hauteur du sous-arbre d'une catégorie (1 = sans enfant). */
function heightOf(categoryId: string, tree: readonly TaxonomyCategory[]): number {
  const children = tree.filter((category) => category.parentId === categoryId);
  return 1 + Math.max(0, ...children.map((child) => heightOf(child.id, tree)));
}

/**
 * Catégorie de produits (arbre par parent_id). Invariants : pas de cycle, profondeur limitée,
 * parent existant et actif. Le slug est unique dans la boutique (contrainte de la base).
 */
export class Category extends AggregateRoot {
  private constructor(
    id: string,
    private data: CategoryData,
  ) {
    super(id);
  }

  static create(
    storeId: string,
    input: { name: string; slug: string; parentId?: string | null; position?: number; tracksUnits?: boolean },
    tree: readonly TaxonomyCategory[],
    now: Date,
    id: string = newId(),
  ): Category {
    const parentId = input.parentId ?? null;
    if (parentId) Category.assertParent(parentId, tree, 1);
    const category = new Category(id, {
      storeId,
      parentId,
      name: normalizeName(input.name),
      slug: Slug.of(input.slug).value,
      position: input.position ?? tree.filter((c) => c.parentId === parentId).length,
      tracksUnits: input.tracksUnits ?? false,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    category.record(createEvent('catalog.category.created', storeId, id, { slug: category.data.slug }, now));
    return category;
  }

  static reconstitute(id: string, data: CategoryData): Category {
    return new Category(id, { ...data });
  }

  /** Le parent existe dans l'arbre actif et la branche ne dépasse pas la profondeur maximale. */
  private static assertParent(parentId: string, tree: readonly TaxonomyCategory[], subtreeHeight: number): void {
    if (!tree.some((category) => category.id === parentId)) {
      throw new InvalidCategoryError('Catégorie parente introuvable ou archivée', 'parentId');
    }
    if (depthOf(parentId, tree) + subtreeHeight > MAX_CATEGORY_DEPTH) {
      throw new InvalidCategoryError(`${MAX_CATEGORY_DEPTH} niveaux de catégories au maximum`, 'parentId');
    }
  }

  get slug(): string {
    return this.data.slug;
  }

  get parentId(): string | null {
    return this.data.parentId;
  }

  get isArchived(): boolean {
    return this.data.archivedAt !== null;
  }

  snapshot(): Readonly<CategoryData> {
    return { ...this.data };
  }

  update(
    patch: { name?: string; slug?: string; position?: number; tracksUnits?: boolean; parentId?: string | null },
    tree: readonly TaxonomyCategory[],
    now: Date,
  ): void {
    let parentId = this.data.parentId;
    if (patch.parentId !== undefined && patch.parentId !== this.data.parentId) {
      parentId = patch.parentId;
      if (parentId) {
        if (parentId === this.id) throw new InvalidCategoryError('Une catégorie ne peut pas être son propre parent', 'parentId');
        if (categoryPath(parentId, tree).some((ancestor) => ancestor.id === this.id)) {
          throw new InvalidCategoryError('Une catégorie ne peut pas être rangée dans l’une de ses sous-catégories', 'parentId');
        }
        Category.assertParent(parentId, tree, heightOf(this.id, tree));
      }
    }
    this.data = {
      ...this.data,
      parentId,
      ...(patch.name !== undefined ? { name: normalizeName(patch.name) } : {}),
      ...(patch.slug !== undefined ? { slug: Slug.of(patch.slug).value } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      ...(patch.tracksUnits !== undefined ? { tracksUnits: patch.tracksUnits } : {}),
      updatedAt: now,
    };
    this.record(createEvent('catalog.category.updated', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  /** Archivage refusé tant que la catégorie porte des produits (non archivés) ou des sous-catégories actives. */
  archive(usage: { products: number; children: number }, now: Date): void {
    if (this.isArchived) return;
    if (usage.children > 0) {
      throw new CategoryInUseError('Archivez ou déplacez d’abord les sous-catégories de cette catégorie');
    }
    if (usage.products > 0) {
      throw new CategoryInUseError(
        usage.products === 1
          ? '1 produit est rangé dans cette catégorie : déplacez-le d’abord'
          : `${usage.products} produits sont rangés dans cette catégorie : déplacez-les d’abord`,
      );
    }
    this.data = { ...this.data, archivedAt: now, updatedAt: now };
    this.record(createEvent('catalog.category.archived', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  restore(tree: readonly TaxonomyCategory[], now: Date): void {
    if (!this.isArchived) return;
    if (this.data.parentId && !tree.some((category) => category.id === this.data.parentId)) {
      throw new InvalidCategoryError('Restaurez d’abord la catégorie parente', 'parentId');
    }
    this.data = { ...this.data, archivedAt: null, updatedAt: now };
    this.record(createEvent('catalog.category.updated', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }
}
