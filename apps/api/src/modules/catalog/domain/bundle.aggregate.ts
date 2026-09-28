import { type BundleDiscountType, MAX_BUNDLE_ITEMS } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export interface BundleData {
  storeId: string;
  title: string;
  anchorProductId: string;
  /** Accessoires du pack, dans l'ordre d'affichage (une unité de chacun). */
  itemProductIds: string[];
  discountType: BundleDiscountType;
  discountValue: number;
  isActive: boolean;
  createdAt: Date;
}

export type BundleFields = Omit<BundleData, 'storeId' | 'createdAt'>;

function normalize(fields: BundleFields): BundleFields {
  const title = fields.title.trim();
  if (!title || title.length > 120) throw new ValidationError('VALIDATION_FAILED', 'Titre requis (120 caractères maximum)');
  const itemProductIds = [...new Set(fields.itemProductIds)];
  if (itemProductIds.length === 0 || itemProductIds.length > MAX_BUNDLE_ITEMS) {
    throw new ValidationError('VALIDATION_FAILED', `Un pack contient de 1 à ${MAX_BUNDLE_ITEMS} accessoires`);
  }
  if (itemProductIds.includes(fields.anchorProductId)) {
    throw new ValidationError('VALIDATION_FAILED', 'L’appareil ne peut pas être aussi un accessoire du pack');
  }
  const max = fields.discountType === 'PERCENT' ? 90 : Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(fields.discountValue) || fields.discountValue < 1 || fields.discountValue > max) {
    throw new ValidationError('VALIDATION_FAILED', 'Remise invalide', { field: 'discountValue' });
  }
  return { ...fields, title, itemProductIds };
}

/** Pack : un appareil et ses accessoires, vendus ensemble avec une remise. */
export class Bundle extends AggregateRoot {
  private constructor(
    id: string,
    private data: BundleData,
  ) {
    super(id);
  }

  static create(storeId: string, fields: BundleFields, now: Date): Bundle {
    const bundle = new Bundle(newId(), { ...normalize(fields), storeId, createdAt: now });
    bundle.changed(now);
    return bundle;
  }

  static reconstitute(id: string, data: BundleData): Bundle {
    return new Bundle(id, { ...data, itemProductIds: [...data.itemProductIds] });
  }

  get anchorProductId(): string {
    return this.data.anchorProductId;
  }

  snapshot(): Readonly<BundleData> {
    return { ...this.data, itemProductIds: [...this.data.itemProductIds] };
  }

  update(fields: BundleFields, now: Date): void {
    const previousAnchor = this.data.anchorProductId;
    this.data = { ...this.data, ...normalize(fields) };
    this.changed(now);
    // L'ancien appareil n'affiche plus le pack : sa fiche doit aussi être rafraîchie.
    if (previousAnchor !== this.data.anchorProductId) this.changed(now, previousAnchor);
  }

  delete(now: Date): void {
    this.changed(now);
  }

  /** Le site revalide la fiche de l'appareil du pack. */
  private changed(now: Date, anchorProductId = this.data.anchorProductId): void {
    this.record(createEvent('catalog.bundle.changed', this.data.storeId, this.id, { anchorProductId }, now));
  }
}
