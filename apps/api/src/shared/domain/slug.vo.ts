import { ValidationError } from './domain-error.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LENGTH = 100;

/** Slug d'URL d'une ressource (produit, marque, catalogue). */
export class Slug {
  private constructor(readonly value: string) {}

  static of(value: string): Slug {
    const normalized = value.trim().toLowerCase();
    if (!SLUG_PATTERN.test(normalized) || normalized.length > MAX_LENGTH) {
      throw new ValidationError('VALIDATION_FAILED', `Slug invalide : « ${value} »`);
    }
    return new Slug(normalized);
  }

  /** « Robe d'été Été 2026 ! » → « robe-d-ete-ete-2026 ». */
  static fromText(text: string): Slug {
    const base = text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_LENGTH)
      .replace(/-+$/g, '');
    return Slug.of(base || 'element');
  }

  /** Variante numérotée pour lever un conflit d'unicité : « robe » → « robe-2 ». */
  withSuffix(suffix: string | number): Slug {
    const tail = `-${suffix}`;
    return Slug.of(`${this.value.slice(0, MAX_LENGTH - tail.length).replace(/-+$/g, '')}${tail}`);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
