import { skuSchema } from '@marche/contracts';
import { newId } from '../../../shared/domain/id.js';
import { InvalidProductError } from './catalog.errors.js';

export interface VariantData {
  id: string;
  sku: string;
  optionValues: string[];
  priceAmount: number;
  compareAtAmount: number | null;
  position: number;
  trackInventory: boolean;
  archivedAt: Date | null;
}

export interface VariantDraft {
  /** Présent pour une variante existante. */
  id?: string;
  sku: string;
  optionValues: string[];
  priceAmount: number;
  compareAtAmount?: number | null;
  trackInventory: boolean;
  initialQuantity?: number;
}

function assertAmount(amount: number, label: string): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new InvalidProductError(`${label} invalide : entier positif en unités mineures attendu`, 'variants');
  }
}

/** Déclinaison vendable d'un produit (entité interne à l'agrégat Product). */
export class ProductVariant {
  private constructor(private readonly data: VariantData) {}

  static fromDraft(draft: VariantDraft, position: number, id: string = newId()): ProductVariant {
    const sku = skuSchema.safeParse(draft.sku);
    if (!sku.success) {
      throw new InvalidProductError(`SKU invalide : « ${draft.sku} »`, 'variants');
    }
    assertAmount(draft.priceAmount, 'Prix');
    if (draft.compareAtAmount !== undefined && draft.compareAtAmount !== null) {
      assertAmount(draft.compareAtAmount, 'Prix barré');
    }
    return new ProductVariant({
      id,
      sku: sku.data,
      optionValues: draft.optionValues.map((value) => value.trim()),
      priceAmount: draft.priceAmount,
      compareAtAmount: draft.compareAtAmount ?? null,
      position,
      trackInventory: draft.trackInventory,
      archivedAt: null,
    });
  }

  static reconstitute(data: VariantData): ProductVariant {
    return new ProductVariant({ ...data, optionValues: [...data.optionValues] });
  }

  get id(): string {
    return this.data.id;
  }

  get sku(): string {
    return this.data.sku;
  }

  get optionValues(): readonly string[] {
    return this.data.optionValues;
  }

  get priceAmount(): number {
    return this.data.priceAmount;
  }

  get trackInventory(): boolean {
    return this.data.trackInventory;
  }

  get isArchived(): boolean {
    return this.data.archivedAt !== null;
  }

  /** « M / Rouge », ou « Par défaut » pour un produit sans option. */
  get title(): string {
    return this.data.optionValues.length > 0 ? this.data.optionValues.join(' / ') : 'Par défaut';
  }

  archived(now: Date): ProductVariant {
    return this.isArchived ? this : new ProductVariant({ ...this.data, archivedAt: now });
  }

  snapshot(): Readonly<VariantData> {
    return { ...this.data, optionValues: [...this.data.optionValues] };
  }
}
