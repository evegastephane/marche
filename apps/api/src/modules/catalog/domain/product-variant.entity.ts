import { skuSchema, type VariantOptions } from '@marche/contracts';
import { newId } from '../../../shared/domain/id.js';
import { InvalidProductError } from './catalog.errors.js';

export interface VariantData {
  id: string;
  sku: string;
  /** Valeurs des axes : { stockage: '256 Go', couleur: 'Noir' } ; {} = variante par défaut. */
  options: VariantOptions;
  /** « 256 Go / Noir » (ordre des axes de la catégorie), ou « Par défaut ». */
  title: string;
  priceAmount: number;
  compareAtAmount: number | null;
  costAmount: number | null;
  barcode: string | null;
  imageMediaId: string | null;
  position: number;
  trackInventory: boolean;
  archivedAt: Date | null;
}

/** Unité (IMEI ou numéro de série) saisie avec une nouvelle variante suivie à l'unité. */
export interface UnitDraft {
  serial: string;
  batteryHealth?: number | null;
  notes?: string | null;
}

export interface VariantDraft {
  /** Présent pour une variante existante. */
  id?: string;
  sku: string;
  options: Record<string, string>;
  priceAmount: number;
  compareAtAmount?: number | null;
  costAmount?: number | null;
  barcode?: string | null;
  imageMediaId?: string | null;
  trackInventory: boolean;
  /** Stock initial (nouvelle variante non suivie à l'unité). */
  initialQuantity?: number;
  /** Unités en stock (nouvelle variante suivie à l'unité) : le stock initial est leur nombre. */
  units?: UnitDraft[];
}

const BARCODE_PATTERN = /^[0-9A-Za-z-]{4,64}$/;

function assertAmount(amount: number, label: string, field: string): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new InvalidProductError(`${label} invalide : entier positif en unités mineures attendu`, field);
  }
}

/** Déclinaison vendable d'un produit (entité interne à l'agrégat Product). */
export class ProductVariant {
  private constructor(private readonly data: VariantData) {}

  /** Les options arrivent déjà validées et ramenées à leur libellé enregistré (voir Product). */
  static fromDraft(
    draft: VariantDraft,
    computed: { options: VariantOptions; title: string; position: number; trackInventory: boolean },
    id: string = newId(),
    field = 'variants',
  ): ProductVariant {
    const sku = skuSchema.safeParse(draft.sku);
    if (!sku.success) throw new InvalidProductError(`SKU invalide : « ${draft.sku} »`, `${field}.sku`);
    assertAmount(draft.priceAmount, 'Prix', `${field}.priceAmount`);
    if (draft.compareAtAmount !== undefined && draft.compareAtAmount !== null) {
      assertAmount(draft.compareAtAmount, 'Prix barré', `${field}.compareAtAmount`);
    }
    if (draft.costAmount !== undefined && draft.costAmount !== null) {
      assertAmount(draft.costAmount, 'Prix d’achat', `${field}.costAmount`);
    }
    const barcode = draft.barcode?.trim() || null;
    if (barcode && !BARCODE_PATTERN.test(barcode)) {
      throw new InvalidProductError('Code-barres : 4 à 64 chiffres ou lettres', `${field}.barcode`);
    }
    return new ProductVariant({
      id,
      sku: sku.data,
      options: { ...computed.options },
      title: computed.title,
      priceAmount: draft.priceAmount,
      compareAtAmount: draft.compareAtAmount ?? null,
      costAmount: draft.costAmount ?? null,
      barcode,
      imageMediaId: draft.imageMediaId ?? null,
      position: computed.position,
      trackInventory: computed.trackInventory,
      archivedAt: null,
    });
  }

  static reconstitute(data: VariantData): ProductVariant {
    return new ProductVariant({ ...data, options: { ...data.options } });
  }

  get id(): string {
    return this.data.id;
  }

  get sku(): string {
    return this.data.sku;
  }

  get options(): Readonly<VariantOptions> {
    return this.data.options;
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

  get title(): string {
    return this.data.title;
  }

  archived(now: Date): ProductVariant {
    return this.isArchived ? this : new ProductVariant({ ...this.data, archivedAt: now });
  }

  snapshot(): Readonly<VariantData> {
    return { ...this.data, options: { ...this.data.options } };
  }
}
