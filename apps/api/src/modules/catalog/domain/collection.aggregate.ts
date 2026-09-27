import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { Slug } from '../../../shared/domain/slug.vo.js';

export interface CollectionData {
  storeId: string;
  title: string;
  slug: string;
  description: string | null;
  imageMediaId: string | null;
  isPublished: boolean;
  position: number;
  /** Produits, dans l'ordre d'affichage. */
  productIds: string[];
  createdAt: Date;
}

export interface CollectionPatch {
  title?: string;
  slug?: string;
  description?: string | null;
  imageMediaId?: string | null;
  isPublished?: boolean;
  position?: number;
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 120) {
    throw new ValidationError('VALIDATION_FAILED', 'Titre requis (120 caractères maximum)');
  }
  return trimmed;
}

/** Catalogue (collection manuelle) : liste ordonnée de produits affichée sur le site. */
export class Collection extends AggregateRoot {
  private constructor(
    id: string,
    private data: CollectionData,
  ) {
    super(id);
  }

  static create(storeId: string, input: CollectionPatch & { title: string; slug: string }, now: Date): Collection {
    const collection = new Collection(newId(), {
      storeId,
      title: normalizeTitle(input.title),
      slug: Slug.of(input.slug).value,
      description: input.description ?? null,
      imageMediaId: input.imageMediaId ?? null,
      isPublished: input.isPublished ?? true,
      position: input.position ?? 0,
      productIds: [],
      createdAt: now,
    });
    collection.record(createEvent('catalog.collection.created', storeId, collection.id, { slug: collection.data.slug }, now));
    return collection;
  }

  static reconstitute(id: string, data: CollectionData): Collection {
    return new Collection(id, { ...data, productIds: [...data.productIds] });
  }

  get slug(): string {
    return this.data.slug;
  }

  get productIds(): readonly string[] {
    return this.data.productIds;
  }

  snapshot(): Readonly<CollectionData> {
    return { ...this.data, productIds: [...this.data.productIds] };
  }

  update(patch: CollectionPatch, now: Date): void {
    this.data = {
      ...this.data,
      ...(patch.title !== undefined ? { title: normalizeTitle(patch.title) } : {}),
      ...(patch.slug !== undefined ? { slug: Slug.of(patch.slug).value } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.imageMediaId !== undefined ? { imageMediaId: patch.imageMediaId } : {}),
      ...(patch.isPublished !== undefined ? { isPublished: patch.isPublished } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
    };
    this.recordUpdated(now);
  }

  /** Remplace la liste ordonnée des produits (sans doublon). */
  setProducts(productIds: readonly string[], now: Date): void {
    if (new Set(productIds).size !== productIds.length) {
      throw new ValidationError('VALIDATION_FAILED', 'Un produit ne peut apparaître qu’une fois dans un catalogue');
    }
    this.data = { ...this.data, productIds: [...productIds] };
    this.recordUpdated(now);
  }

  markDeleted(now: Date): void {
    this.record(createEvent('catalog.collection.deleted', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  private recordUpdated(now: Date): void {
    this.record(createEvent('catalog.collection.updated', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }
}
