import { CURRENCY_EXPONENT, type Currency, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@marche/contracts';

export function paymentLabel(method: PaymentMethod, provider?: string | null): string {
  return method === 'MOBILE_MONEY' && provider ? provider : PAYMENT_METHOD_LABELS[method];
}

/** Billets et pièces en circulation, en unités de la devise (du plus grand au plus petit). */
const DENOMINATIONS: Record<Currency, { value: number; kind: 'billet' | 'pièce' }[]> = {
  XOF: [
    { value: 10_000, kind: 'billet' },
    { value: 5_000, kind: 'billet' },
    { value: 2_000, kind: 'billet' },
    { value: 1_000, kind: 'billet' },
    { value: 500, kind: 'pièce' },
    { value: 250, kind: 'pièce' },
    { value: 200, kind: 'pièce' },
    { value: 100, kind: 'pièce' },
    { value: 50, kind: 'pièce' },
    { value: 25, kind: 'pièce' },
    { value: 10, kind: 'pièce' },
    { value: 5, kind: 'pièce' },
  ],
  XAF: [
    { value: 10_000, kind: 'billet' },
    { value: 5_000, kind: 'billet' },
    { value: 2_000, kind: 'billet' },
    { value: 1_000, kind: 'billet' },
    { value: 500, kind: 'billet' },
    { value: 500, kind: 'pièce' },
    { value: 100, kind: 'pièce' },
    { value: 50, kind: 'pièce' },
    { value: 25, kind: 'pièce' },
    { value: 10, kind: 'pièce' },
    { value: 5, kind: 'pièce' },
  ],
  EUR: [
    { value: 200, kind: 'billet' },
    { value: 100, kind: 'billet' },
    { value: 50, kind: 'billet' },
    { value: 20, kind: 'billet' },
    { value: 10, kind: 'billet' },
    { value: 5, kind: 'billet' },
    { value: 2, kind: 'pièce' },
    { value: 1, kind: 'pièce' },
    { value: 0.5, kind: 'pièce' },
    { value: 0.2, kind: 'pièce' },
    { value: 0.1, kind: 'pièce' },
    { value: 0.05, kind: 'pièce' },
    { value: 0.02, kind: 'pièce' },
    { value: 0.01, kind: 'pièce' },
  ],
  USD: [
    { value: 100, kind: 'billet' },
    { value: 50, kind: 'billet' },
    { value: 20, kind: 'billet' },
    { value: 10, kind: 'billet' },
    { value: 5, kind: 'billet' },
    { value: 1, kind: 'billet' },
    { value: 0.25, kind: 'pièce' },
    { value: 0.1, kind: 'pièce' },
    { value: 0.05, kind: 'pièce' },
    { value: 0.01, kind: 'pièce' },
  ],
  GBP: [
    { value: 50, kind: 'billet' },
    { value: 20, kind: 'billet' },
    { value: 10, kind: 'billet' },
    { value: 5, kind: 'billet' },
    { value: 2, kind: 'pièce' },
    { value: 1, kind: 'pièce' },
    { value: 0.5, kind: 'pièce' },
    { value: 0.2, kind: 'pièce' },
    { value: 0.1, kind: 'pièce' },
    { value: 0.05, kind: 'pièce' },
    { value: 0.02, kind: 'pièce' },
    { value: 0.01, kind: 'pièce' },
  ],
  MAD: [
    { value: 200, kind: 'billet' },
    { value: 100, kind: 'billet' },
    { value: 50, kind: 'billet' },
    { value: 20, kind: 'billet' },
    { value: 10, kind: 'pièce' },
    { value: 5, kind: 'pièce' },
    { value: 2, kind: 'pièce' },
    { value: 1, kind: 'pièce' },
    { value: 0.5, kind: 'pièce' },
  ],
};

/** Coupures de la devise, en unités mineures. */
export function denominations(currency: Currency): { amount: number; kind: 'billet' | 'pièce'; key: string }[] {
  const scale = 10 ** CURRENCY_EXPONENT[currency];
  return DENOMINATIONS[currency].map((denomination) => ({
    amount: Math.round(denomination.value * scale),
    kind: denomination.kind,
    key: `${denomination.kind}-${denomination.value}`,
  }));
}

/**
 * Montants que le client tend le plus souvent pour payer `due` : le compte juste, puis l'arrondi
 * aux coupures courantes au-dessus (5 000, 10 000, 20 000…). Trois propositions au plus.
 */
export function quickCashAmounts(due: number, currency: Currency): number[] {
  if (due <= 0) return [];
  const scale = 10 ** CURRENCY_EXPONENT[currency];
  const steps = (currency === 'XOF' || currency === 'XAF' ? [1_000, 5_000, 10_000] : [5, 10, 20, 50, 100]).map((step) => step * scale);
  const amounts = new Set<number>();
  for (const step of steps) {
    const rounded = Math.ceil(due / step) * step;
    if (rounded > due) amounts.add(rounded);
  }
  return [...amounts].sort((a, b) => a - b).slice(0, 3);
}

/** Indicatif téléphonique des pays où Upsell est servi. */
const DIAL_CODES: Record<string, { code: string; dropLeadingZero: boolean }> = {
  CI: { code: '225', dropLeadingZero: false },
  SN: { code: '221', dropLeadingZero: false },
  CM: { code: '237', dropLeadingZero: false },
  BJ: { code: '229', dropLeadingZero: false },
  TG: { code: '228', dropLeadingZero: false },
  BF: { code: '226', dropLeadingZero: false },
  ML: { code: '223', dropLeadingZero: false },
  NE: { code: '227', dropLeadingZero: false },
  GN: { code: '224', dropLeadingZero: false },
  GA: { code: '241', dropLeadingZero: false },
  CG: { code: '242', dropLeadingZero: false },
  CD: { code: '243', dropLeadingZero: true },
  MA: { code: '212', dropLeadingZero: true },
  FR: { code: '33', dropLeadingZero: true },
  BE: { code: '32', dropLeadingZero: true },
  GB: { code: '44', dropLeadingZero: true },
  US: { code: '1', dropLeadingZero: false },
};

/** Numéro au format international sans « + » (wa.me), à partir d'un numéro saisi librement. */
export function internationalNumber(phone: string, country: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6) return null;
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  const dial = DIAL_CODES[country];
  if (!dial) return digits;
  if (digits.startsWith(dial.code) && digits.length > dial.code.length + 7) return digits;
  return `${dial.code}${dial.dropLeadingZero ? digits.replace(/^0/, '') : digits}`;
}

/** Lien WhatsApp qui ouvre la conversation du client, message pré-rempli (rien n'est envoyé sans le vendeur). */
export function whatsappLink(phone: string, country: string, text: string): string | null {
  const number = internationalNumber(phone, country);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}
