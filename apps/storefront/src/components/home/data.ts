/*
 * Boutique d'exemple « Chez Awa » (Dakar, FCFA) : toutes les données de l'accueil sont synthétiques.
 * Les produits n'ont pas de photo : leur tissu est dessiné (wax.tsx).
 */

export type Wax =
  'cercles' | 'feuilles' | 'losanges' | 'raphia' | 'bazin' | 'bandes';

export interface DemoProduct {
  id: string;
  name: string;
  price: number;
  /** Variante montrée dans les listes (taille, longueur…). */
  variant: string;
  sku: string;
  wax: Wax;
  /** Quantité de départ ; la page la fait vivre ensuite (stock, caisse). */
  stock: number;
  /** Seuil d'alerte de stock bas. */
  threshold: number;
}

export const DEMO_STORE = { name: 'Chez Awa', city: 'Dakar' };

export const PRODUCTS: DemoProduct[] = [
  {
    id: 'robe',
    name: 'Robe wax Ndeye',
    price: 18000,
    variant: 'Taille M',
    sku: 'RW-NDY-M',
    wax: 'cercles',
    stock: 7,
    threshold: 3,
  },
  {
    id: 'pagne',
    name: 'Pagne wax Feuilles',
    price: 15000,
    variant: '6 yards',
    sku: 'PW-FEU-6',
    wax: 'feuilles',
    stock: 12,
    threshold: 4,
  },
  {
    id: 'boubou',
    name: 'Boubou brodé',
    price: 35000,
    variant: 'Taille L',
    sku: 'BB-BRO-L',
    wax: 'losanges',
    stock: 2,
    threshold: 3,
  },
  {
    id: 'sac',
    name: 'Sac en raphia',
    price: 12500,
    variant: 'Naturel',
    sku: 'SR-NAT',
    wax: 'raphia',
    stock: 5,
    threshold: 2,
  },
  {
    id: 'bazin',
    name: 'Bazin riche indigo',
    price: 28000,
    variant: '5 mètres',
    sku: 'BZ-IND-5',
    wax: 'bazin',
    stock: 4,
    threshold: 2,
  },
  {
    id: 'chemise',
    name: 'Chemise wax Bandes',
    price: 16500,
    variant: 'Taille L',
    sku: 'CW-BAN-L',
    wax: 'bandes',
    stock: 9,
    threshold: 3,
  },
];

export function productById(id: string): DemoProduct {
  return PRODUCTS.find((product) => product.id === id) ?? PRODUCTS[0]!;
}

export type PaymentState = 'UNPAID' | 'PAID';
export type OrderState = 'PLACED' | 'FULFILLED';

export interface DemoOrder {
  number: number;
  customer: string;
  productId: string;
  quantity: number;
  payment: PaymentState;
  status: OrderState;
  source: 'Site' | 'Caisse' | 'WhatsApp';
  /** Minutes écoulées depuis la commande, pour le libellé relatif. */
  minutesAgo: number;
  /** Total d'une vente à plusieurs articles (caisse) ; sinon prix × quantité. */
  total?: number;
}

export function orderAmount(
  order: Pick<DemoOrder, 'productId' | 'quantity' | 'total'>,
): number {
  return order.total ?? productById(order.productId).price * order.quantity;
}

/** File de départ du tableau de bord d'exemple. */
export const SEED_ORDERS: DemoOrder[] = [
  {
    number: 1043,
    customer: 'Mame Diarra N.',
    productId: 'pagne',
    quantity: 2,
    payment: 'UNPAID',
    status: 'PLACED',
    source: 'Site',
    minutesAgo: 18,
  },
  {
    number: 1042,
    customer: 'Ibrahima F.',
    productId: 'boubou',
    quantity: 1,
    payment: 'PAID',
    status: 'PLACED',
    source: 'Site',
    minutesAgo: 52,
  },
  {
    number: 1041,
    customer: 'Khady S.',
    productId: 'sac',
    quantity: 1,
    payment: 'PAID',
    status: 'PLACED',
    source: 'WhatsApp',
    minutesAgo: 95,
  },
  {
    number: 1040,
    customer: 'Comptoir',
    productId: 'robe',
    quantity: 1,
    payment: 'PAID',
    status: 'FULFILLED',
    source: 'Caisse',
    minutesAgo: 140,
  },
  {
    number: 1039,
    customer: 'Ousmane D.',
    productId: 'chemise',
    quantity: 2,
    payment: 'PAID',
    status: 'FULFILLED',
    source: 'Site',
    minutesAgo: 230,
  },
];

/** Commandes qui tombent pendant qu'on regarde, dans cet ordre. */
export const ARRIVALS: Omit<DemoOrder, 'number' | 'minutesAgo'>[] = [
  {
    customer: 'Aminata B.',
    productId: 'robe',
    quantity: 1,
    payment: 'UNPAID',
    status: 'PLACED',
    source: 'Site',
  },
  {
    customer: 'Cheikh T.',
    productId: 'bazin',
    quantity: 1,
    payment: 'PAID',
    status: 'PLACED',
    source: 'WhatsApp',
  },
  {
    customer: 'Fatimata K.',
    productId: 'pagne',
    quantity: 1,
    payment: 'UNPAID',
    status: 'PLACED',
    source: 'Site',
  },
  {
    customer: 'Babacar N.',
    productId: 'chemise',
    quantity: 1,
    payment: 'PAID',
    status: 'PLACED',
    source: 'Site',
  },
];

/** Ventes affichées selon la période (hors annulées). */
export const REVENUE = {
  '7d': { amount: 412500, orders: 23 },
  '30d': { amount: 1846000, orders: 96 },
  '90d': { amount: 5210500, orders: 271 },
} as const;
export type Period = keyof typeof REVENUE;

export const CUSTOMERS = [
  {
    name: 'Mame Diarra N.',
    phone: '+221 77 ••• •• 14',
    orders: 6,
    total: 104000,
    whatsapp: true,
  },
  {
    name: 'Ibrahima F.',
    phone: '+221 76 ••• •• 02',
    orders: 3,
    total: 71000,
    whatsapp: true,
  },
  {
    name: 'Khady S.',
    phone: '+221 78 ••• •• 63',
    orders: 9,
    total: 158500,
    whatsapp: true,
  },
  {
    name: 'Ousmane D.',
    phone: '+221 77 ••• •• 81',
    orders: 2,
    total: 33000,
    whatsapp: false,
  },
  {
    name: 'Aminata B.',
    phone: '+221 70 ••• •• 37',
    orders: 4,
    total: 66000,
    whatsapp: true,
  },
];

export const REQUESTS = [
  {
    what: 'Robe wax Ndeye en taille XL',
    when: 'il y a 2 h',
    state: 'Nouvelle',
  },
  { what: 'Boubou brodé, coloris blanc', when: 'hier', state: 'Nouvelle' },
  {
    what: 'Pagne wax Feuilles × 10 (mariage)',
    when: 'il y a 3 j',
    state: 'Répondue',
  },
];

/** Modèles de site réels d'Upsell adaptés à une boutique de mode, avec leur première palette. */
export const TEMPLATES = [
  {
    id: 'default',
    name: 'Natif',
    palette: {
      bg: '#FFFFFF',
      fg: '#101115',
      muted: '#595B62',
      surface: '#F4F4F1',
      line: '#E4E4E0',
      primary: '#101115',
      accent: '#F66B21',
    },
  },
  {
    id: 'atelier',
    name: 'Le cahier du tailleur',
    palette: {
      bg: '#F8F5EE',
      fg: '#1C2333',
      muted: '#525A6C',
      surface: '#EFE9DC',
      line: '#C5D4EA',
      primary: '#B3302A',
      accent: '#1F3FA0',
    },
  },
  {
    id: 'couverture',
    name: 'La couverture de magazine',
    palette: {
      bg: '#FFFFFF',
      fg: '#151515',
      muted: '#5B5B5B',
      surface: '#FFE14D',
      line: '#E6E1DA',
      primary: '#C2006A',
      accent: '#E4007C',
    },
  },
  {
    id: 'devanture',
    name: 'La devanture peinte',
    palette: {
      bg: '#1D5E9F',
      fg: '#FFF6E3',
      muted: '#DCE8F5',
      surface: '#FFF6E3',
      line: '#141414',
      primary: '#F4C20D',
      accent: '#D7263D',
    },
  },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]['id'];

const money = new Intl.NumberFormat('fr-FR');

/** Montant FCFA sans décimales, espaces fines insécables comme le dashboard. */
export function fcfa(amount: number): string {
  return `${money.format(amount)} FCFA`;
}

export function amount(amount: number): string {
  return money.format(amount);
}

export function relative(minutes: number): string {
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)} h`;
}
