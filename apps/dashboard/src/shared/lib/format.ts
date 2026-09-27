import { CURRENCY_EXPONENT, type Currency } from '@marche/contracts';

const moneyFormats = new Map<Currency, Intl.NumberFormat>();

/** Montant en unités mineures → texte dans la devise de la boutique (5000 XOF → « 5 000 F CFA »). */
export function formatMoney(amount: number, currency: Currency): string {
  let format = moneyFormats.get(currency);
  if (!format) {
    const digits = CURRENCY_EXPONENT[currency];
    format = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    moneyFormats.set(currency, format);
  }
  return format.format(amount / 10 ** CURRENCY_EXPONENT[currency]);
}

/** Montant sans le symbole, pour les chiffres peints en grand (le symbole est posé à côté). */
export function formatAmount(amount: number, currency: Currency): string {
  const digits = CURRENCY_EXPONENT[currency];
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits);
}

export function currencyLabel(currency: Currency): string {
  return currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency === 'EUR' ? '€' : currency;
}

/** Saisie du marchand (« 12 500 » ou « 19,90 ») → unités mineures. */
export function parseAmount(input: string, currency: Currency): number | null {
  const normalized = input.replace(/[\s  ]/g, '').replace(',', '.');
  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const digits = CURRENCY_EXPONENT[currency];
  return Math.round(Number(normalized) * 10 ** digits);
}

/** Unités mineures → valeur de saisie (5000 XOF → « 5000 », 1990 EUR → « 19,90 »). */
export function amountToInput(amount: number, currency: Currency): string {
  const digits = CURRENCY_EXPONENT[currency];
  return digits === 0 ? String(amount) : (amount / 10 ** digits).toFixed(digits).replace('.', ',');
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** « il y a 3 h », « hier », puis la date au-delà d'une semaine. */
export function formatRelative(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  return formatDate(iso);
}

export function orderNumber(number: number | null): string {
  return number === null ? 'Brouillon' : `#${number}`;
}

export function plural(count: number, one: string, many: string): string {
  return `${new Intl.NumberFormat('fr-FR').format(count)} ${count > 1 ? many : one}`;
}

/** Slug d'adresse à partir d'un nom : « Chez Awa » → « chez-awa ». */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}
