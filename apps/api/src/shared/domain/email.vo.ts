import { ValidationError } from './domain-error.js';

// Validation volontairement simple : la vérification forte a lieu en amont (schéma Zod).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(readonly value: string) {}

  static of(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('VALIDATION_FAILED', `Adresse e-mail invalide : « ${value} »`);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
