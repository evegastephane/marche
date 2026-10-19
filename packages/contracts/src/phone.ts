/**
 * Numéros de téléphone : règles pures partagées par l'API (campagnes WhatsApp) et le site (bouton WhatsApp).
 */

/** Indicatifs des pays proposés à la création de boutique (docs/PRODUCT.md, Operating Context). */
export const CALLING_CODES: Record<string, string> = {
  SN: '221',
  CI: '225',
  ML: '223',
  BF: '226',
  BJ: '229',
  TG: '228',
  NE: '227',
  GW: '245',
  CM: '237',
  GA: '241',
  CG: '242',
  TD: '235',
  CF: '236',
  GQ: '240',
  MA: '212',
  FR: '33',
  BE: '32',
};

/**
 * Numéro saisi librement → format international sans « + » attendu par WhatsApp (ex. « 221770000000 »).
 * « +221 77 000 00 00 », « 00221770000000 » et « 77 000 00 00 » (boutique au Sénégal) donnent le même résultat.
 * Retourne null si le numéro est inexploitable.
 */
export function toWhatsAppNumber(raw: string, storeCountry: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) {
    // déjà international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else {
    const code = CALLING_CODES[storeCountry.toUpperCase()];
    if (!code) return null;
    // Numéro national : le 0 initial (France, Belgique, Maroc…) tombe devant l'indicatif.
    digits = digits.startsWith(code) && digits.length > code.length + 7 ? digits : code + digits.replace(/^0/, '');
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
