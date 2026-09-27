import { ConflictError } from '../../../shared/domain/domain-error.js';
import { Slug } from '../../../shared/domain/slug.vo.js';

const MAX_ATTEMPTS = 50;

/** Premier slug libre : « robe », puis « robe-2 », « robe-3 »… */
export async function allocateSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const slug = Slug.fromText(base);
  if (!(await exists(slug.value))) return slug.value;
  for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = slug.withSuffix(attempt).value;
    if (!(await exists(candidate))) return candidate;
  }
  throw new ConflictError('SLUG_TAKEN', `Impossible de trouver une adresse libre à partir de « ${slug.value} »`);
}

const MAX_SKU_LENGTH = 64;

/** « TS-01 » → « TS-01-COPIE », puis « TS-01-COPIE2 »… (longueur bornée). */
export function copiedSku(sku: string, attempt: number): string {
  const suffix = attempt === 1 ? '-COPIE' : `-COPIE${attempt}`;
  return `${sku.slice(0, MAX_SKU_LENGTH - suffix.length)}${suffix}`;
}
