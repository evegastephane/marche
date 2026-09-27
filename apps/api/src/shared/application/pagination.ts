import { ValidationError } from '../domain/domain-error.js';

/**
 * Curseurs opaques (base64url d'un tuple JSON) pour la pagination « keyset ».
 * Ex. pour un tri (updatedAt desc, id desc) : encodeCursor([updatedAt.toISOString(), id]).
 */
export function encodeCursor(parts: readonly (string | number)[]): string {
  return Buffer.from(JSON.stringify(parts)).toString('base64url');
}

export function decodeCursor(cursor: string, size: number): (string | number)[] {
  try {
    const parts: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      Array.isArray(parts) &&
      parts.length === size &&
      parts.every((p) => typeof p === 'string' || typeof p === 'number')
    ) {
      return parts as (string | number)[];
    }
  } catch {
    // curseur illisible : traité ci-dessous
  }
  throw new ValidationError('VALIDATION_FAILED', 'Curseur de pagination invalide');
}

/** Découpe « limit + 1 » lignes en une page et calcule le curseur suivant. */
export function toPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => readonly (string | number)[],
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return { items, nextCursor: hasMore && last ? encodeCursor(cursorOf(last)) : null };
}
