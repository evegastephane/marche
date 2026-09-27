import { ConflictError } from '../../../shared/domain/domain-error.js';

export class StoreSlugTakenError extends ConflictError {
  constructor(slug: string) {
    super('STORE_SLUG_TAKEN', `L’adresse « ${slug} » est déjà utilisée par une autre boutique`, { slug });
  }
}
