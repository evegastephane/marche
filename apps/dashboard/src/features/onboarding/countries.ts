import type { Currency } from '@marche/contracts';

export interface CountryChoice {
  code: string;
  name: string;
  currency: Currency;
  timezone: string;
}

/** Pays proposés à la création de boutique, avec leur devise et leur fuseau par défaut. */
export const COUNTRIES: CountryChoice[] = [
  { code: 'SN', name: 'Sénégal', currency: 'XOF', timezone: 'Africa/Dakar' },
  { code: 'CI', name: 'Côte d’Ivoire', currency: 'XOF', timezone: 'Africa/Abidjan' },
  { code: 'ML', name: 'Mali', currency: 'XOF', timezone: 'Africa/Bamako' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', timezone: 'Africa/Ouagadougou' },
  { code: 'BJ', name: 'Bénin', currency: 'XOF', timezone: 'Africa/Porto-Novo' },
  { code: 'TG', name: 'Togo', currency: 'XOF', timezone: 'Africa/Lome' },
  { code: 'NE', name: 'Niger', currency: 'XOF', timezone: 'Africa/Niamey' },
  { code: 'GW', name: 'Guinée-Bissau', currency: 'XOF', timezone: 'Africa/Bissau' },
  { code: 'CM', name: 'Cameroun', currency: 'XAF', timezone: 'Africa/Douala' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', timezone: 'Africa/Libreville' },
  { code: 'CG', name: 'Congo', currency: 'XAF', timezone: 'Africa/Brazzaville' },
  { code: 'TD', name: 'Tchad', currency: 'XAF', timezone: 'Africa/Ndjamena' },
  { code: 'CF', name: 'Centrafrique', currency: 'XAF', timezone: 'Africa/Bangui' },
  { code: 'GQ', name: 'Guinée équatoriale', currency: 'XAF', timezone: 'Africa/Malabo' },
  { code: 'MA', name: 'Maroc', currency: 'MAD', timezone: 'Africa/Casablanca' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'BE', name: 'Belgique', currency: 'EUR', timezone: 'Europe/Brussels' },
];

export const CURRENCY_NAMES: Record<Currency, string> = {
  XOF: 'Franc CFA de l’Ouest (FCFA)',
  XAF: 'Franc CFA d’Afrique centrale (FCFA)',
  EUR: 'Euro (€)',
  MAD: 'Dirham marocain (MAD)',
  USD: 'Dollar américain ($)',
  GBP: 'Livre sterling (£)',
};
