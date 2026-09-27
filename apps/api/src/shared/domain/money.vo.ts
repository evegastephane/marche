import { CURRENCY_EXPONENT, type Currency } from '@marche/contracts';
import { ValidationError } from './domain-error.js';

export { type Currency };

/** Montant en unités mineures + devise. Jamais de flottant (docs/ARCHITECTURE.md §5.4). */
export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  static of(amount: number, currency: Currency): Money {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `Montant invalide : ${amount} (entier positif en unités mineures attendu)`,
      );
    }
    return new Money(amount, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount + other.amount, this.currency);
  }

  times(quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ValidationError('VALIDATION_FAILED', `Quantité invalide : ${quantity}`);
    }
    return Money.of(this.amount * quantity, this.currency);
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount >= other.amount;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  /** Affichage localisé, ex. « 19,90 € » ou « 5 000 F CFA ». */
  format(locale = 'fr-FR'): string {
    const exponent = CURRENCY_EXPONENT[this.currency];
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(this.amount / 10 ** exponent);
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `Devises incompatibles : ${this.currency} et ${other.currency}`,
      );
    }
  }
}
