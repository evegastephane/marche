import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { Slug } from '../../../shared/domain/slug.vo.js';

export interface BrandData {
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  logoMediaId: string | null;
  createdAt: Date;
  archivedAt: Date | null;
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    throw new ValidationError('VALIDATION_FAILED', 'Nom de marque requis (80 caractères maximum)');
  }
  return trimmed;
}

export class Brand extends AggregateRoot {
  private constructor(
    id: string,
    private data: BrandData,
  ) {
    super(id);
  }

  static create(
    storeId: string,
    input: { name: string; slug: string; description?: string | null; logoMediaId?: string | null },
    now: Date,
  ): Brand {
    const brand = new Brand(newId(), {
      storeId,
      name: normalizeName(input.name),
      slug: Slug.of(input.slug).value,
      description: input.description ?? null,
      logoMediaId: input.logoMediaId ?? null,
      createdAt: now,
      archivedAt: null,
    });
    brand.record(createEvent('catalog.brand.created', storeId, brand.id, { name: brand.data.name }, now));
    return brand;
  }

  static reconstitute(id: string, data: BrandData): Brand {
    return new Brand(id, { ...data });
  }

  get slug(): string {
    return this.data.slug;
  }

  get isArchived(): boolean {
    return this.data.archivedAt !== null;
  }

  snapshot(): Readonly<BrandData> {
    return { ...this.data };
  }

  update(
    patch: { name?: string; slug?: string; description?: string | null; logoMediaId?: string | null },
    now: Date,
  ): void {
    this.data = {
      ...this.data,
      ...(patch.name !== undefined ? { name: normalizeName(patch.name) } : {}),
      ...(patch.slug !== undefined ? { slug: Slug.of(patch.slug).value } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.logoMediaId !== undefined ? { logoMediaId: patch.logoMediaId } : {}),
    };
    this.record(createEvent('catalog.brand.updated', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }

  archive(now: Date): void {
    if (this.isArchived) return;
    this.data = { ...this.data, archivedAt: now };
    this.record(createEvent('catalog.brand.archived', this.data.storeId, this.id, {}, now));
  }

  restore(now: Date): void {
    if (!this.isArchived) return;
    this.data = { ...this.data, archivedAt: null };
    this.record(createEvent('catalog.brand.updated', this.data.storeId, this.id, { slug: this.data.slug }, now));
  }
}
