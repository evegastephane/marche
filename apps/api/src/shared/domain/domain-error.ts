/**
 * Erreurs métier typées. Le filtre HTTP les traduit en problem+json (RFC 9457) :
 * validation → 422, not_found → 404, conflict → 409, forbidden → 403.
 */
export type DomainErrorKind = 'validation' | 'not_found' | 'conflict' | 'forbidden';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;

  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly kind = 'validation' as const;
}

export class NotFoundError extends DomainError {
  readonly kind = 'not_found' as const;

  constructor(entity: string, id?: string) {
    super('NOT_FOUND', id ? `${entity} introuvable (${id})` : `${entity} introuvable`, {
      entity,
      id,
    });
  }
}

export class ConflictError extends DomainError {
  readonly kind = 'conflict' as const;
}

export class ForbiddenError extends DomainError {
  readonly kind = 'forbidden' as const;
}

export class ConcurrentModificationError extends ConflictError {
  constructor(entity: string) {
    super(
      'CONCURRENT_MODIFICATION',
      `${entity} a été modifié entre-temps : rechargez avant d’enregistrer`,
    );
  }
}
