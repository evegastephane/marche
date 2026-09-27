import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';

/** R1 : SKU unique par boutique. */
export class SkuTakenError extends ConflictError {
  constructor(readonly skus: string[]) {
    super(
      'SKU_TAKEN',
      skus.length === 1 ? `Le SKU « ${skus[0]} » est déjà utilisé` : `SKU déjà utilisés : ${skus.join(', ')}`,
      { skus },
    );
  }
}

/** R1 : slug (handle) unique par boutique. */
export class SlugTakenError extends ConflictError {
  constructor(slug: string) {
    super('SLUG_TAKEN', `L’adresse « ${slug} » est déjà utilisée`, { slug });
  }
}

/** R3 : un produit ne passe ACTIVE que s'il est complet. */
export class ProductNotPublishableError extends ValidationError {
  constructor(reason: string) {
    super('PRODUCT_NOT_PUBLISHABLE', `Ce produit ne peut pas être publié : ${reason}`);
  }
}

export class InvalidProductError extends ValidationError {
  constructor(message: string, field?: string) {
    super('VALIDATION_FAILED', message, field ? { field } : undefined);
  }
}
