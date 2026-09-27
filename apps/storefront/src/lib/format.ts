import { CURRENCY_EXPONENT, type Currency } from '@marche/contracts';

const formats = new Map<Currency, Intl.NumberFormat>();

/** Montant en unités mineures dans la devise de la boutique (5000 XOF → « 5 000 F CFA »). */
export function formatMoney(amount: number, currency: Currency): string {
  let format = formats.get(currency);
  if (!format) {
    const digits = CURRENCY_EXPONENT[currency];
    format = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formats.set(currency, format);
  }
  return format.format(amount / 10 ** CURRENCY_EXPONENT[currency]);
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
