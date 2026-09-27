import { CURRENCY_EXPONENT, type Currency } from '@marche/contracts';

/** 2500000 XOF → « 2 500 000 F CFA » ; 1990 EUR → « 19,90 € ». */
export function formatMoney(amount: number, currency: Currency, locale = 'fr-FR'): string {
  const exponent = CURRENCY_EXPONENT[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amount / 10 ** exponent);
}

export function formatOrderNumber(number: number | null): string {
  return number === null ? 'brouillon' : `#${number}`;
}
