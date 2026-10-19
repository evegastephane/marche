/**
 * Données de démonstration (docs/PLAN-CODE.md §5.2) : 4 boutiques (Observe, tech à Douala en XAF ;
 * Mode en XOF ; déco en EUR ; Électronique en XOF), catalogue dynamique de départ, marques, produits
 * rangés par catégorie avec fiche technique et variantes, stock par mouvements, unités IMEI,
 * catalogues, accessoires, packs, demandes et site généré. Idempotent : une boutique déjà présente est ignorée.
 *
 * SEED_CLERK_ORG_ID (optionnel) : rattache la première boutique (Observe) à votre organisation Clerk
 * de dev, pour la retrouver dans le dashboard une fois connecté.
 */
import {
  combinationKey,
  DEFAULT_SHIPPING_SETTINGS,
  defaultTemplateManifest,
  defaultTemplateSettings,
  type StoreType,
  valueKey,
  variantTitle,
} from '@marche/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { v7 as uuidv7 } from 'uuid';
import { type Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { CATALOG_TEMPLATES } from '../src/modules/catalog/domain/catalog-templates/catalog-template.js';
import { applyCatalogTemplate } from '../src/modules/catalog/infrastructure/catalog-template.writer.js';
import { StoreTaxonomy, type Tx } from './scripts/store-taxonomy.js';

try {
  process.loadEnvFile('.env');
} catch {
  // variables déjà présentes dans l'environnement
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type SpecValue = string | number | boolean | string[];

interface SeedVariant {
  sku: string;
  /** Valeurs des axes : { stockage: '256 Go', couleur: 'Noir' } ; absent = variante par défaut. */
  options?: Record<string, string>;
  price: number;
  compareAt?: number;
  cost?: number;
  stock: number;
  /** Santé batterie des unités (appareils d'occasion suivis à l'unité), une valeur par pièce. */
  batteries?: number[];
}

interface SeedProduct {
  title: string;
  brand?: string;
  description: string;
  /** Slug de la catégorie du catalogue de départ. */
  category: string;
  reference?: string;
  warrantyMonths?: number;
  specs?: Record<string, SpecValue>;
  /** Axes dans l'ordre d'affichage (le libellé des variantes suit cet ordre). */
  axes?: string[];
  /**
   * Valeurs d'axe communes à toutes les variantes : la taille d'écran d'un téléphone vendu en une seule
   * taille (c'est un axe, pas une ligne de fiche, pour pouvoir proposer d'autres tailles ensuite).
   */
  sharedOptions?: Record<string, string>;
  /** Axes propres à la boutique, créés s'ils manquent : slug → nom. */
  newAxes?: Record<string, string>;
  /** Pastilles de couleurs absentes du nuancier. */
  swatches?: Record<string, string>;
  variants: SeedVariant[];
  /** Accessoires proposés à la main (titres d'autres produits de la boutique). */
  accessories?: string[];
}

interface SeedBundle {
  title: string;
  anchor: string;
  items: string[];
  discountType: 'PERCENT' | 'AMOUNT';
  discountValue: number;
}

interface SeedRequest {
  product: string;
  options: { name: string; value: string }[];
  quantity: number;
  firstName: string;
  email: string;
  phone: string;
  note?: string;
  quote?: { unitPriceAmount: number; delay: string };
}

interface SeedStore {
  slug: string;
  name: string;
  type: StoreType;
  currency: 'EUR' | 'XOF' | 'XAF';
  country: string;
  timezone: string;
  shipping: Prisma.InputJsonValue;
  brands: string[];
  collections: { title: string; products: string[] }[];
  products: SeedProduct[];
  bundles?: SeedBundle[];
  requests?: SeedRequest[];
}

const STORES: SeedStore[] = [
  {
    slug: 'observe',
    name: 'Observe',
    type: 'ELECTRONICS',
    currency: 'XAF',
    country: 'CM',
    timezone: 'Africa/Douala',
    shipping: { strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 2000, thresholdAmount: 200000 },
    brands: ['Apple', 'Samsung', 'Sony', 'JBL', 'Anker', 'EA Sports'],
    collections: [
      { title: 'Nouveautés', products: ['iPhone 17 Pro', 'Galaxy S25 Ultra', 'AirPods Pro 3', 'PS5 Pro'] },
      {
        title: 'Accessoires',
        products: ['Chargeur 35 W double USB-C', 'Câble USB-C tressé 60 W', 'Batterie externe 20 000 mAh', 'Apple Pencil Pro'],
      },
      { title: 'Occasions certifiées', products: ['iPhone 13 Pro reconditionné'] },
    ],
    products: [
      {
        title: 'iPhone 17 Pro',
        brand: 'Apple',
        description: 'Écran Super Retina XDR de 6,3 pouces, puce A19 Pro, triple appareil photo 48 Mpx, châssis en aluminium.',
        category: 'smartphones',
        reference: 'IP17P',
        warrantyMonths: 12,
        specs: { reseau: '5G' },
        sharedOptions: { 'taille-ecran': '6,3 pouces' },
        axes: ['stockage', 'ram', 'couleur', 'taille-ecran'],
        // 1 To n'existe qu'en Orange : les autres combinaisons ont été décochées.
        variants: [
          { sku: 'IP17P-256-12G-SLV', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Argent' }, price: 1050000, cost: 910000, stock: 3 },
          { sku: 'IP17P-256-12G-BLU', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Bleu' }, price: 1050000, cost: 910000, stock: 2 },
          { sku: 'IP17P-256-12G-ORG', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Orange' }, price: 1050000, cost: 910000, stock: 4 },
          { sku: 'IP17P-512-12G-SLV', options: { stockage: '512 Go', ram: '12 Go', couleur: 'Argent' }, price: 1250000, cost: 1090000, stock: 1 },
          { sku: 'IP17P-512-12G-ORG', options: { stockage: '512 Go', ram: '12 Go', couleur: 'Orange' }, price: 1250000, cost: 1090000, stock: 2 },
          { sku: 'IP17P-1T-12G-ORG', options: { stockage: '1 To', ram: '12 Go', couleur: 'Orange' }, price: 1450000, cost: 1270000, stock: 1 },
        ],
        accessories: ['Chargeur 35 W double USB-C', 'Câble USB-C tressé 60 W', 'AirPods Pro 3'],
      },
      {
        title: 'Galaxy S25 Ultra',
        brand: 'Samsung',
        description: 'Écran Dynamic AMOLED 2X de 6,9 pouces, S Pen intégré, appareil photo 200 Mpx.',
        category: 'smartphones',
        reference: 'SGS25U',
        warrantyMonths: 24,
        specs: { reseau: '5G' },
        sharedOptions: { 'taille-ecran': '6,9 pouces' },
        axes: ['stockage', 'ram', 'couleur', 'taille-ecran'],
        variants: [
          { sku: 'SGS25U-256-12G-TBK', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Titane noir' }, price: 890000, stock: 2 },
          { sku: 'SGS25U-256-12G-SLV', options: { stockage: '256 Go', ram: '12 Go', couleur: 'Argent' }, price: 890000, stock: 1 },
          { sku: 'SGS25U-512-12G-TBK', options: { stockage: '512 Go', ram: '12 Go', couleur: 'Titane noir' }, price: 1020000, stock: 1 },
        ],
      },
      {
        title: 'iPhone 13 Pro reconditionné',
        brand: 'Apple',
        description: 'Contrôlé en 40 points, batterie testée, livré avec un câble. Garantie 6 mois.',
        category: 'smartphones',
        reference: 'IP13P',
        warrantyMonths: 6,
        specs: { reseau: '5G' },
        sharedOptions: { 'taille-ecran': '6,1 pouces' },
        axes: ['stockage', 'ram', 'couleur', 'etat', 'taille-ecran'],
        variants: [
          {
            sku: 'IP13P-128-6G-GPH-RFA',
            options: { stockage: '128 Go', ram: '6 Go', couleur: 'Graphite', etat: 'Reconditionné – Excellent' },
            price: 420000,
            stock: 2,
            batteries: [92, 89],
          },
          {
            sku: 'IP13P-128-6G-GPH-RFC',
            options: { stockage: '128 Go', ram: '6 Go', couleur: 'Graphite', etat: 'Reconditionné – Bon' },
            price: 360000,
            stock: 1,
            batteries: [84],
          },
          {
            sku: 'IP13P-256-6G-SLV-RFB',
            options: { stockage: '256 Go', ram: '6 Go', couleur: 'Argent', etat: 'Reconditionné – Très bon' },
            price: 450000,
            stock: 1,
            batteries: [88],
          },
        ],
      },
      {
        title: 'AirPods Pro 3',
        brand: 'Apple',
        description: 'Réduction active du bruit, audio spatial, étui de charge USB-C.',
        category: 'ecouteurs',
        reference: 'APP3',
        warrantyMonths: 12,
        specs: { connectivite: ['Bluetooth'], autonomie: 8, 'reduction-bruit': true, type: 'Intra-auriculaire' },
        axes: ['couleur'],
        variants: [{ sku: 'APP3-WHT', options: { couleur: 'Blanc' }, price: 185000, cost: 150000, stock: 8 }],
      },
      {
        title: 'Sony WH-1000XM6',
        brand: 'Sony',
        description: 'Casque à réduction de bruit, 30 heures d’autonomie, pliable.',
        category: 'casques',
        reference: 'WH1000XM6',
        warrantyMonths: 12,
        specs: { connectivite: ['Bluetooth', 'Filaire'], autonomie: 30, 'reduction-bruit': true, type: 'Circum-auriculaire' },
        axes: ['couleur'],
        variants: [
          { sku: 'WH1000XM6-BLK', options: { couleur: 'Noir' }, price: 265000, stock: 3 },
          { sku: 'WH1000XM6-SLV', options: { couleur: 'Argent' }, price: 265000, stock: 2 },
        ],
      },
      {
        title: 'JBL Flip 7',
        brand: 'JBL',
        description: 'Enceinte portable étanche IP68, 14 heures de musique.',
        category: 'enceintes',
        reference: 'FLIP7',
        specs: { connectivite: ['Bluetooth'], autonomie: 14, puissance: 35 },
        axes: ['couleur'],
        variants: [
          { sku: 'FLIP7-BLK', options: { couleur: 'Noir' }, price: 95000, stock: 5 },
          { sku: 'FLIP7-BLU', options: { couleur: 'Bleu' }, price: 95000, stock: 3 },
          { sku: 'FLIP7-RED', options: { couleur: 'Rouge' }, price: 95000, stock: 0 },
        ],
      },
      {
        title: 'Apple Pencil Pro',
        brand: 'Apple',
        description: 'Pression, inclinaison, geste de pression et retour haptique.',
        category: 'apple-pencil',
        reference: 'APPENCILPRO',
        warrantyMonths: 12,
        specs: { compatibilite: ['iPad Pro', 'iPad Air'] },
        variants: [{ sku: 'APPENCILPRO', price: 95000, stock: 5 }],
      },
      {
        title: 'Chargeur 35 W double USB-C',
        brand: 'Apple',
        description: 'Deux appareils chargés en même temps, format compact.',
        category: 'chargeurs',
        reference: 'CHG35W',
        warrantyMonths: 12,
        specs: {
          puissance: 35,
          'type-connecteur': 'USB-C',
          'nombre-ports': 2,
          compatibilite: ['iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max', 'iPad Air'],
        },
        variants: [{ sku: 'CHG35W', price: 45000, cost: 30000, stock: 15 }],
      },
      {
        title: 'Câble USB-C tressé 60 W',
        brand: 'Anker',
        description: 'Gaine tressée, résiste à 20 000 pliages.',
        category: 'cables',
        reference: 'CBLC60',
        specs: { 'type-connecteur': 'USB-C', puissance: 60 },
        axes: ['longueur', 'couleur'],
        variants: [
          { sku: 'CBLC60-1M-BLK', options: { longueur: '1 m', couleur: 'Noir' }, price: 8000, stock: 20 },
          { sku: 'CBLC60-1M-WHT', options: { longueur: '1 m', couleur: 'Blanc' }, price: 8000, stock: 12 },
          { sku: 'CBLC60-2M-BLK', options: { longueur: '2 m', couleur: 'Noir' }, price: 10000, stock: 9 },
        ],
      },
      {
        title: 'Batterie externe 20 000 mAh',
        brand: 'Anker',
        description: 'Charge rapide 30 W, trois ports, recharge un iPhone quatre fois.',
        category: 'batteries-externes',
        reference: 'ANK20K',
        warrantyMonths: 18,
        specs: { capacite: 20000, puissance: 30, 'nombre-ports': 3, 'charge-rapide': true },
        axes: ['couleur'],
        variants: [{ sku: 'ANK20K-BLK', options: { couleur: 'Noir' }, price: 35000, stock: 10 }],
      },
      {
        title: 'PS5 Pro',
        brand: 'Sony',
        description: 'Console PlayStation 5 Pro, SSD 2 To, lecteur non inclus.',
        category: 'ps5',
        reference: 'PS5PRO',
        warrantyMonths: 12,
        specs: { edition: 'Pro' },
        axes: ['stockage'],
        variants: [{ sku: 'PS5PRO-2T', options: { stockage: '2 To' }, price: 520000, cost: 460000, stock: 2 }],
        accessories: ['Manette DualSense', 'EA Sports FC 26'],
      },
      {
        title: 'EA Sports FC 26',
        brand: 'EA Sports',
        description: 'Édition PS5, textes et voix en français.',
        category: 'jeux',
        reference: 'FC26PS5',
        specs: { editeur: 'EA Sports', genre: 'Sport', pegi: '3', langue: 'Français', edition: 'Standard' },
        variants: [{ sku: 'FC26PS5', price: 38000, stock: 12 }],
      },
      {
        title: 'Manette DualSense',
        brand: 'Sony',
        description: 'Retour haptique et gâchettes adaptatives.',
        category: 'manettes',
        reference: 'DUALSENSE',
        warrantyMonths: 12,
        specs: { compatibilite: ['PS5'] },
        axes: ['couleur'],
        variants: [
          { sku: 'DUALSENSE-WHT', options: { couleur: 'Blanc' }, price: 55000, stock: 6 },
          { sku: 'DUALSENSE-BLK', options: { couleur: 'Noir' }, price: 55000, stock: 4 },
        ],
      },
      {
        title: 'Apple Watch Series 11',
        brand: 'Apple',
        description: 'Écran toujours allumé, suivi du sommeil, étanche 50 m.',
        category: 'montres-connectees',
        reference: 'AWS11',
        warrantyMonths: 12,
        specs: { bracelet: 'Sport', gps: true, connectivite: ['Bluetooth', 'Wi-Fi'] },
        axes: ['taille', 'couleur'],
        variants: [
          { sku: 'AWS11-42-BLK', options: { taille: '42 mm', couleur: 'Noir' }, price: 320000, stock: 1 },
          { sku: 'AWS11-46-BLK', options: { taille: '46 mm', couleur: 'Noir' }, price: 345000, stock: 2 },
          { sku: 'AWS11-46-SLV', options: { taille: '46 mm', couleur: 'Argent' }, price: 345000, stock: 1 },
        ],
      },
      {
        title: 'Galaxy SmartTag2',
        brand: 'Samsung',
        description: 'Retrouvez clés et sacs avec l’application SmartThings.',
        category: 'smart-tag',
        reference: 'SMARTTAG2',
        variants: [{ sku: 'SMARTTAG2', price: 22000, stock: 6 }],
      },
    ],
    bundles: [
      {
        title: 'Pack iPhone 17 Pro + chargeur 35 W',
        anchor: 'iPhone 17 Pro',
        items: ['Chargeur 35 W double USB-C'],
        discountType: 'PERCENT',
        discountValue: 5,
      },
    ],
    requests: [
      {
        product: 'iPhone 17 Pro',
        options: [
          { name: 'Stockage', value: '1 To' },
          { name: 'Couleur', value: 'Argent' },
        ],
        quantity: 1,
        firstName: 'Brice',
        email: 'brice@example.com',
        phone: '+237 6 90 11 22 33',
        note: 'Livraison à Bonamoussadi si possible.',
      },
    ],
  },
  {
    slug: 'chez-awa',
    name: 'Chez Awa',
    type: 'FASHION',
    currency: 'XOF',
    country: 'SN',
    timezone: 'Africa/Dakar',
    shipping: { strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 2000, thresholdAmount: 50000 },
    brands: ['Wax Élégance', 'Atelier Ndar'],
    collections: [
      { title: 'Nouveautés', products: ['Boubou brodé', 'Pagne wax', 'Sac en raphia'] },
      { title: 'Accessoires', products: ['Sac en raphia', 'Bracelet perles', 'Sandales cuir'] },
    ],
    products: [
      {
        title: 'Boubou brodé',
        brand: 'Atelier Ndar',
        description: 'Boubou en bazin brodé main, coupe ample.',
        category: 'vetements',
        specs: {
          rayon: 'Femme',
          matiere: 'Bazin riche, 100 % coton',
          entretien: ['Lavage à la main', 'Repassage doux'],
          origine: 'Brodé à Saint-Louis',
        },
        axes: ['taille', 'couleur'],
        accessories: ['Bracelet perles', 'Sandales cuir'],
        variants: [
          { sku: 'BOU-M-BN', options: { taille: 'M', couleur: 'Bleu nuit' }, price: 35000, stock: 4 },
          { sku: 'BOU-M-OR', options: { taille: 'M', couleur: 'Or' }, price: 35000, stock: 2 },
          { sku: 'BOU-L-BN', options: { taille: 'L', couleur: 'Bleu nuit' }, price: 37000, stock: 6 },
          { sku: 'BOU-L-OR', options: { taille: 'L', couleur: 'Or' }, price: 37000, stock: 0 },
          { sku: 'BOU-XL-BN', options: { taille: 'XL', couleur: 'Bleu nuit' }, price: 39000, stock: 3 },
          { sku: 'BOU-XL-OR', options: { taille: 'XL', couleur: 'Or' }, price: 39000, stock: 1 },
        ],
      },
      {
        title: 'Pagne wax',
        brand: 'Wax Élégance',
        description: 'Coupon de 6 yards, 100 % coton.',
        category: 'autres',
        variants: [{ sku: 'WAX-6Y', price: 12000, compareAt: 15000, stock: 25 }],
      },
      {
        title: 'Sac en raphia',
        description: 'Tressé à la main à Thiès.',
        category: 'accessoires-mode',
        specs: { rayon: 'Femme', matiere: 'Raphia naturel', origine: 'Thiès' },
        variants: [{ sku: 'SAC-RAPH', price: 18000, stock: 7 }],
      },
      {
        title: 'Bracelet perles',
        description: 'Perles de verre recyclé.',
        category: 'accessoires-mode',
        specs: { rayon: 'Mixte', matiere: 'Verre recyclé' },
        axes: ['couleur'],
        swatches: { Turquoise: '#1FB5AD' },
        variants: [
          { sku: 'BRA-RGE', options: { couleur: 'Rouge' }, price: 5000, stock: 12 },
          { sku: 'BRA-TRQ', options: { couleur: 'Turquoise' }, price: 5000, stock: 3 },
        ],
      },
      {
        title: 'Sandales cuir',
        brand: 'Atelier Ndar',
        description: 'Cuir tanné végétal, semelle cousue.',
        category: 'chaussures',
        specs: { rayon: 'Femme', matiere: 'Cuir de vachette' },
        axes: ['pointure', 'couleur'],
        variants: [
          { sku: 'SAN-37-MA', options: { pointure: '37', couleur: 'Marron' }, price: 22000, stock: 2 },
          { sku: 'SAN-38-MA', options: { pointure: '38', couleur: 'Marron' }, price: 22000, stock: 4 },
          { sku: 'SAN-39-MA', options: { pointure: '39', couleur: 'Marron' }, price: 22000, stock: 0 },
          { sku: 'SAN-38-NO', options: { pointure: '38', couleur: 'Noir' }, price: 22000, stock: 3 },
          { sku: 'SAN-40-NO', options: { pointure: '40', couleur: 'Noir' }, price: 22000, stock: 1 },
        ],
      },
    ],
  },
  {
    slug: 'maison-lumiere',
    name: 'Maison Lumière',
    type: 'FASHION',
    currency: 'EUR',
    country: 'FR',
    timezone: 'Europe/Paris',
    shipping: { strategy: 'FLAT_RATE', flatRateAmount: 590 },
    brands: ['Lumière & Co'],
    collections: [{ title: 'Salon', products: ['Bougie ambrée', 'Vase en grès', 'Plaid en lin'] }],
    products: [
      {
        title: 'Bougie ambrée',
        brand: 'Lumière & Co',
        description: 'Cire végétale, 45 heures de combustion.',
        category: 'autres',
        variants: [{ sku: 'BOU-AMB', price: 2490, stock: 40 }],
      },
      {
        title: 'Vase en grès',
        description: 'Émaillé à la main.',
        category: 'autres',
        axes: ['format'],
        newAxes: { format: 'Format' },
        variants: [
          { sku: 'VASE-P', options: { format: 'Petit' }, price: 3200, stock: 5 },
          { sku: 'VASE-G', options: { format: 'Grand' }, price: 5400, stock: 2 },
        ],
      },
      {
        title: 'Plaid en lin',
        brand: 'Lumière & Co',
        description: 'Lin lavé, 130 × 170 cm.',
        category: 'autres',
        variants: [{ sku: 'PLAID-LIN', price: 8900, compareAt: 11000, stock: 9 }],
      },
    ],
  },
  {
    slug: 'volta-mobile',
    name: 'Volta Mobile',
    type: 'ELECTRONICS',
    currency: 'XOF',
    country: 'SN',
    timezone: 'Africa/Dakar',
    shipping: { strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 2500, thresholdAmount: 100000 },
    brands: ['Apple', 'Samsung', 'Volta Audio'],
    collections: [
      { title: 'Téléphones', products: ['iPhone 12', 'Galaxy A54'] },
      {
        title: 'Accessoires',
        products: ['Chargeur 20 W USB-C', 'Coque MagSafe iPhone 12', 'Écouteurs sans fil', 'Casque Studio', 'Enceinte Nomade'],
      },
    ],
    products: [
      {
        title: 'iPhone 12',
        brand: 'Apple',
        description: 'Écran Super Retina XDR de 6,1 pouces, puce A14 Bionic, double appareil photo 12 Mpx.',
        category: 'smartphones',
        reference: 'IP12',
        warrantyMonths: 12,
        specs: { reseau: '5G' },
        sharedOptions: { 'taille-ecran': '6,1 pouces' },
        axes: ['stockage', 'ram', 'couleur', 'etat', 'taille-ecran'],
        variants: [
          { sku: 'IP12-128-BL-N', options: { stockage: '128 Go', ram: '4 Go', couleur: 'Bleu', etat: 'Neuf' }, price: 320000, stock: 3 },
          { sku: 'IP12-256-BL-N', options: { stockage: '256 Go', ram: '4 Go', couleur: 'Bleu', etat: 'Neuf' }, price: 365000, stock: 1 },
          { sku: 'IP12-128-NO-N', options: { stockage: '128 Go', ram: '4 Go', couleur: 'Noir', etat: 'Neuf' }, price: 320000, stock: 4 },
          {
            sku: 'IP12-128-VI-R',
            options: { stockage: '128 Go', ram: '4 Go', couleur: 'Violet', etat: 'Reconditionné – Excellent' },
            price: 245000,
            compareAt: 320000,
            stock: 2,
            batteries: [91, 90],
          },
          {
            sku: 'IP12-256-NO-R',
            options: { stockage: '256 Go', ram: '4 Go', couleur: 'Noir', etat: 'Reconditionné – Excellent' },
            price: 280000,
            compareAt: 365000,
            stock: 1,
            batteries: [93],
          },
          { sku: 'IP12-128-RO-N', options: { stockage: '128 Go', ram: '4 Go', couleur: 'Rouge', etat: 'Neuf' }, price: 320000, stock: 0 },
        ],
        accessories: ['Écouteurs sans fil'],
      },
      {
        title: 'Galaxy A54',
        brand: 'Samsung',
        description: 'Écran Super AMOLED 120 Hz de 6,4 pouces, triple appareil photo 50 Mpx, 5G.',
        category: 'smartphones',
        reference: 'SGA54',
        warrantyMonths: 24,
        specs: { reseau: '5G' },
        sharedOptions: { 'taille-ecran': '6,4 pouces' },
        axes: ['stockage', 'ram', 'couleur', 'taille-ecran'],
        variants: [
          { sku: 'A54-128-NO', options: { stockage: '128 Go', ram: '8 Go', couleur: 'Noir' }, price: 215000, stock: 6 },
          { sku: 'A54-128-VI', options: { stockage: '128 Go', ram: '8 Go', couleur: 'Violet' }, price: 215000, stock: 3 },
          { sku: 'A54-256-NO', options: { stockage: '256 Go', ram: '8 Go', couleur: 'Noir' }, price: 245000, stock: 2 },
        ],
      },
      {
        title: 'Chargeur 20 W USB-C',
        brand: 'Apple',
        description: 'Charge rapide : 50 % en 30 minutes.',
        category: 'chargeurs',
        warrantyMonths: 12,
        specs: { puissance: 20, 'type-connecteur': 'USB-C', 'nombre-ports': 1, compatibilite: ['iPhone 12', 'iPhone 13', 'Galaxy A54'] },
        variants: [{ sku: 'CHG-20W', price: 15000, stock: 30 }],
      },
      {
        title: 'Coque MagSafe iPhone 12',
        brand: 'Apple',
        description: 'Silicone doux, aimants MagSafe intégrés.',
        category: 'coques-pochettes',
        specs: { compatibilite: ['iPhone 12'] },
        axes: ['couleur'],
        variants: [
          { sku: 'COQ-12-NO', options: { couleur: 'Noir' }, price: 9000, stock: 10 },
          { sku: 'COQ-12-BL', options: { couleur: 'Bleu' }, price: 9000, stock: 6 },
          { sku: 'COQ-12-RO', options: { couleur: 'Rouge' }, price: 9000, stock: 2 },
        ],
      },
      {
        title: 'Écouteurs sans fil',
        brand: 'Volta Audio',
        description: 'Réduction de bruit active, 24 heures d’autonomie avec l’étui.',
        category: 'ecouteurs',
        warrantyMonths: 12,
        specs: { connectivite: ['Bluetooth'], autonomie: 24, 'reduction-bruit': true, type: 'Intra-auriculaire' },
        axes: ['couleur'],
        variants: [{ sku: 'ECO-ANC', options: { couleur: 'Blanc' }, price: 35000, compareAt: 42000, stock: 12 }],
      },
      {
        title: 'Casque Studio',
        brand: 'Volta Audio',
        description: 'Casque arceau, 40 heures d’autonomie.',
        category: 'casques',
        warrantyMonths: 24,
        specs: { connectivite: ['Bluetooth'], autonomie: 40, type: 'Circum-auriculaire' },
        axes: ['couleur'],
        variants: [
          { sku: 'CAS-NO', options: { couleur: 'Noir' }, price: 55000, stock: 4 },
          { sku: 'CAS-BL', options: { couleur: 'Blanc' }, price: 55000, stock: 2 },
        ],
      },
      {
        title: 'Enceinte Nomade',
        brand: 'Volta Audio',
        description: 'Étanche IP67, 12 heures de musique.',
        category: 'enceintes',
        specs: { connectivite: ['Bluetooth'], autonomie: 12, puissance: 20 },
        axes: ['couleur'],
        variants: [{ sku: 'ENC-NOM', options: { couleur: 'Noir' }, price: 28000, stock: 8 }],
      },
    ],
    bundles: [
      { title: 'Pack iPhone 12 + chargeur', anchor: 'iPhone 12', items: ['Chargeur 20 W USB-C'], discountType: 'PERCENT', discountValue: 10 },
      {
        title: 'Pack Galaxy A54 + écouteurs',
        anchor: 'Galaxy A54',
        items: ['Écouteurs sans fil'],
        discountType: 'AMOUNT',
        discountValue: 10000,
      },
    ],
    requests: [
      {
        product: 'iPhone 12',
        options: [
          { name: 'Stockage', value: '512 Go' },
          { name: 'Couleur', value: 'Vert' },
        ],
        quantity: 1,
        firstName: 'Moussa',
        email: 'moussa@example.com',
        phone: '+221 77 111 22 33',
        note: 'Livraison à Thiès si possible.',
      },
      {
        product: 'Galaxy A54',
        options: [
          { name: 'Stockage', value: '256 Go' },
          { name: 'Couleur', value: 'Violet' },
        ],
        quantity: 2,
        firstName: 'Fatou',
        email: 'fatou@example.com',
        phone: '+221 78 444 55 66',
        quote: { unitPriceAmount: 250000, delay: '5 jours' },
      },
    ],
  },
];

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** IMEI de démonstration à 15 chiffres, stable et valide (clé de Luhn). */
function demoImei(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const body = `35${String(hash).padStart(12, '0').slice(-12)}`;
  const sum = [...body].reverse().reduce((total, digit, index) => {
    const n = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (n > 9 ? n - 9 : n);
  }, 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

async function seedProducts(tx: Tx, storeId: string, seed: SeedStore, brandIds: Map<string, string>): Promise<Map<string, string>> {
  const taxonomy = await StoreTaxonomy.load(tx, storeId);
  const productIds = new Map<string, string>();

  for (const product of seed.products) {
    const category = taxonomy.categories.get(product.category);
    if (!category) throw new Error(`Catégorie inconnue dans le seed : ${product.category}`);

    // Valeurs de listes absentes du catalogue de départ : ajoutées (comme le ferait le commerçant).
    const specs: Record<string, SpecValue> = {};
    for (const [slug, value] of Object.entries(product.specs ?? {})) {
      const attribute = taxonomy.get(slug);
      if (!attribute) throw new Error(`Attribut inconnu dans le seed : ${slug}`);
      if (attribute.type === 'SELECT' && typeof value === 'string') specs[slug] = await taxonomy.value(attribute, value);
      else if (attribute.type === 'MULTI_SELECT' && Array.isArray(value)) {
        const values: string[] = [];
        for (const v of value) values.push(await taxonomy.value(attribute, v));
        specs[slug] = values;
      } else specs[slug] = value;
    }

    const productId = uuidv7();
    productIds.set(product.title, productId);
    await tx.product.create({
      data: {
        id: productId,
        storeId,
        brandId: product.brand ? (brandIds.get(product.brand) ?? null) : null,
        categoryId: category.id,
        reference: product.reference ?? null,
        title: product.title,
        slug: slugify(product.title),
        description: product.description,
        status: 'ACTIVE',
        warrantyMonths: product.warrantyMonths ?? null,
        specs: specs as Prisma.InputJsonValue,
        publishedAt: new Date(),
      },
    });

    for (const [position, variant] of product.variants.entries()) {
      const options: Record<string, string> = {};
      for (const [slug, value] of Object.entries({ ...variant.options, ...product.sharedOptions })) {
        const name = product.newAxes?.[slug];
        const attribute = name
          ? await taxonomy.attribute({ slug, name, type: 'SELECT', isVariantAxis: true })
          : taxonomy.get(slug);
        if (!attribute?.isVariantAxis) throw new Error(`Axe inconnu dans le seed : ${slug}`);
        await taxonomy.link(category.id, attribute);
        options[slug] = await taxonomy.value(attribute, value, product.swatches?.[value]);
      }
      const variantId = uuidv7();
      await tx.productVariant.create({
        data: {
          id: variantId,
          storeId,
          productId,
          sku: variant.sku,
          title: variantTitle(options, product.axes),
          options,
          combinationKey: combinationKey(options),
          priceAmount: variant.price,
          compareAtAmount: variant.compareAt ?? null,
          costAmount: variant.cost ?? null,
          position,
        },
      });

      // Stock : le niveau naît à 0, chaque entrée est un mouvement (appliqué par la base).
      await tx.inventoryLevel.create({ data: { variantId, storeId, tracksUnits: category.tracksUnits } });
      if (variant.stock <= 0) continue;
      if (category.tracksUnits) {
        const used = options.etat !== undefined && valueKey(options.etat) !== valueKey('Neuf');
        for (let n = 0; n < variant.stock; n++) {
          const unitId = uuidv7();
          await tx.stockUnit.create({
            data: {
              id: unitId,
              storeId,
              variantId,
              serial: demoImei(`${variant.sku}-${n}`),
              condition: used ? 'USED' : 'NEW',
              batteryHealth: variant.batteries?.[n] ?? null,
            },
          });
          await tx.stockMovement.create({
            data: { storeId, variantId, stockUnitId: unitId, type: 'INITIAL', quantity: 1, onHandAfter: 0 },
          });
        }
      } else {
        await tx.stockMovement.create({
          data: { storeId, variantId, type: 'INITIAL', quantity: variant.stock, onHandAfter: 0 },
        });
      }
    }
  }
  return productIds;
}

async function seedStore(seed: SeedStore, clerkOrgId: string, ownerId: string): Promise<void> {
  if (await prisma.store.findUnique({ where: { slug: seed.slug } })) {
    console.log(`• ${seed.name} existe déjà : ignorée`);
    return;
  }
  const storeId = uuidv7();
  await prisma.$transaction(
    async (tx) => {
      await tx.store.create({
        data: {
          id: storeId,
          clerkOrgId,
          name: seed.name,
          slug: seed.slug,
          type: seed.type,
          currency: seed.currency,
          country: seed.country,
          timezone: seed.timezone,
          contactEmail: `contact@${seed.slug}.example`,
          shippingSettings: seed.shipping ?? (DEFAULT_SHIPPING_SETTINGS as Prisma.InputJsonValue),
          counter: { create: {} },
          members: { create: { userId: ownerId, role: 'OWNER' } },
        },
      });

      // Catégories et attributs de départ, selon le type de boutique.
      await applyCatalogTemplate(tx, storeId, CATALOG_TEMPLATES[seed.type]);

      const brandIds = new Map<string, string>();
      for (const name of seed.brands) {
        const id = uuidv7();
        brandIds.set(name, id);
        await tx.brand.create({ data: { id, storeId, name, slug: slugify(name) } });
      }

      const productIds = await seedProducts(tx, storeId, seed, brandIds);
      const idOf = (title: string) => {
        const id = productIds.get(title);
        if (!id) throw new Error(`Produit inconnu dans le seed : ${title}`);
        return id;
      };

      for (const product of seed.products) {
        if (!product.accessories?.length) continue;
        await tx.productRelation.createMany({
          data: product.accessories.map((title, position) => ({
            storeId,
            productId: idOf(product.title),
            relatedProductId: idOf(title),
            type: 'ACCESSORY' as const,
            position,
          })),
        });
      }

      for (const bundle of seed.bundles ?? []) {
        const bundleId = uuidv7();
        await tx.bundle.create({
          data: {
            id: bundleId,
            storeId,
            title: bundle.title,
            anchorProductId: idOf(bundle.anchor),
            discountType: bundle.discountType,
            discountValue: bundle.discountValue,
            items: { create: bundle.items.map((title, position) => ({ storeId, productId: idOf(title), position })) },
          },
        });
      }

      for (const request of seed.requests ?? []) {
        await tx.specialRequest.create({
          data: {
            storeId,
            productId: idOf(request.product),
            productTitle: request.product,
            productSlug: slugify(request.product),
            options: request.options,
            quantity: request.quantity,
            firstName: request.firstName,
            email: request.email,
            phone: request.phone,
            note: request.note ?? null,
            currency: seed.currency,
            status: request.quote ? 'QUOTED' : 'NEW',
            quotedUnitPriceAmount: request.quote?.unitPriceAmount ?? null,
            quotedDelay: request.quote?.delay ?? null,
          },
        });
      }

      let firstCollection: { id: string; title: string } | null = null;
      for (const [position, collection] of seed.collections.entries()) {
        const id = uuidv7();
        firstCollection ??= { id, title: collection.title };
        await tx.collection.create({
          data: {
            id,
            storeId,
            title: collection.title,
            slug: slugify(collection.title),
            position,
            products: {
              create: collection.products.map((title, index) => ({
                storeId,
                productId: idOf(title),
                position: index,
              })),
            },
          },
        });
      }

      const settings = structuredClone(defaultTemplateSettings);
      settings.sections = settings.sections.map((section) => {
        if (section.type === 'hero') return { ...section, title: `Bienvenue chez ${seed.name}` };
        if (section.type === 'featured-collection' && firstCollection) {
          return { ...section, collectionId: firstCollection.id, title: firstCollection.title };
        }
        return section;
      });
      await tx.site.create({
        data: {
          storeId,
          subdomain: seed.slug,
          templateId: defaultTemplateManifest.id,
          templateVersion: defaultTemplateManifest.version,
          themeSettings: settings as unknown as Prisma.InputJsonValue,
          draftThemeSettings: settings as unknown as Prisma.InputJsonValue,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    },
    { timeout: 60_000 },
  );
  console.log(`✓ ${seed.name} (${seed.currency}) : ${seed.products.length} produits, ${seed.bundles?.length ?? 0} packs, site publié`);
}

async function main(): Promise<void> {
  const owner = await prisma.user.upsert({
    where: { clerkUserId: 'user_demo_seed' },
    create: { clerkUserId: 'user_demo_seed', email: 'demo@marche.localhost', firstName: 'Démo', lastName: 'Marché' },
    update: {},
  });
  for (const [index, store] of STORES.entries()) {
    const clerkOrgId = index === 0 && process.env.SEED_CLERK_ORG_ID ? process.env.SEED_CLERK_ORG_ID : `org_demo_${store.slug}`;
    await seedStore(store, clerkOrgId, owner.id);
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
