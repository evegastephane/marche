/**
 * Données de démonstration (docs/PLAN-CODE.md §5.2) : 3 boutiques (Mode en XOF, déco en EUR,
 * Électronique en XOF), marques, produits typés, stock, catalogues, accessoires, packs, demandes
 * et site généré. Idempotent : une boutique déjà présente est ignorée.
 *
 * SEED_CLERK_ORG_ID (optionnel) : rattache la première boutique à votre organisation Clerk de dev,
 * pour la retrouver dans le dashboard une fois connecté.
 */
import {
  DEFAULT_SHIPPING_SETTINGS,
  defaultTemplateManifest,
  defaultTemplateSettings,
  type OptionType,
  type ProductAttributes,
  type ProductKind,
  type StoreType,
} from '@marche/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { v7 as uuidv7 } from 'uuid';
import { type Prisma, PrismaClient } from '../src/generated/prisma/client.js';

try {
  process.loadEnvFile('.env');
} catch {
  // variables déjà présentes dans l'environnement
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

interface SeedProduct {
  title: string;
  brand?: string;
  description: string;
  kind?: ProductKind;
  attributes?: ProductAttributes;
  options?: { name: string; type?: OptionType; values: string[]; swatches?: Record<string, string> }[];
  variants: { sku: string; values?: string[]; price: number; compareAt?: number; stock: number }[];
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
  currency: 'EUR' | 'XOF';
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
        kind: 'CLOTHING',
        attributes: {
          audience: 'FEMME',
          composition: 'Bazin riche, 100 % coton',
          care: ['Lavage à la main', 'Repassage doux'],
          origin: 'Brodé à Saint-Louis',
        },
        options: [
          { name: 'Taille', type: 'size', values: ['M', 'L', 'XL'] },
          { name: 'Couleur', type: 'color', values: ['Bleu nuit', 'Or'] },
        ],
        accessories: ['Bracelet perles', 'Sandales cuir'],
        variants: [
          { sku: 'BOU-M-BN', values: ['M', 'Bleu nuit'], price: 35000, stock: 4 },
          { sku: 'BOU-M-OR', values: ['M', 'Or'], price: 35000, stock: 2 },
          { sku: 'BOU-L-BN', values: ['L', 'Bleu nuit'], price: 37000, stock: 6 },
          { sku: 'BOU-L-OR', values: ['L', 'Or'], price: 37000, stock: 0 },
          { sku: 'BOU-XL-BN', values: ['XL', 'Bleu nuit'], price: 39000, stock: 3 },
          { sku: 'BOU-XL-OR', values: ['XL', 'Or'], price: 39000, stock: 1 },
        ],
      },
      {
        title: 'Pagne wax',
        brand: 'Wax Élégance',
        description: 'Coupon de 6 yards, 100 % coton.',
        variants: [{ sku: 'WAX-6Y', price: 12000, compareAt: 15000, stock: 25 }],
      },
      {
        title: 'Sac en raphia',
        description: 'Tressé à la main à Thiès.',
        kind: 'FASHION_ACCESSORY',
        attributes: { audience: 'FEMME', composition: 'Raphia naturel', origin: 'Thiès' },
        variants: [{ sku: 'SAC-RAPH', price: 18000, stock: 7 }],
      },
      {
        title: 'Bracelet perles',
        description: 'Perles de verre recyclé.',
        kind: 'FASHION_ACCESSORY',
        attributes: { audience: 'MIXTE', composition: 'Verre recyclé' },
        options: [{ name: 'Couleur', type: 'color', values: ['Rouge', 'Turquoise'], swatches: { Turquoise: '#1FB5AD' } }],
        variants: [
          { sku: 'BRA-RGE', values: ['Rouge'], price: 5000, stock: 12 },
          { sku: 'BRA-TRQ', values: ['Turquoise'], price: 5000, stock: 3 },
        ],
      },
      {
        title: 'Sandales cuir',
        brand: 'Atelier Ndar',
        description: 'Cuir tanné végétal, semelle cousue.',
        kind: 'SHOES',
        attributes: { audience: 'FEMME', composition: 'Cuir de vachette', care: ['Nettoyage à sec'] },
        options: [
          { name: 'Pointure', type: 'shoe_size', values: ['37', '38', '39', '40'] },
          { name: 'Couleur', type: 'color', values: ['Marron', 'Noir'] },
        ],
        variants: [
          { sku: 'SAN-37-MA', values: ['37', 'Marron'], price: 22000, stock: 2 },
          { sku: 'SAN-38-MA', values: ['38', 'Marron'], price: 22000, stock: 4 },
          { sku: 'SAN-39-MA', values: ['39', 'Marron'], price: 22000, stock: 0 },
          { sku: 'SAN-38-NO', values: ['38', 'Noir'], price: 22000, stock: 3 },
          { sku: 'SAN-40-NO', values: ['40', 'Noir'], price: 22000, stock: 1 },
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
        variants: [{ sku: 'BOU-AMB', price: 2490, stock: 40 }],
      },
      {
        title: 'Vase en grès',
        description: 'Émaillé à la main.',
        options: [{ name: 'Taille', values: ['Petit', 'Grand'] }],
        variants: [
          { sku: 'VASE-P', values: ['Petit'], price: 3200, stock: 5 },
          { sku: 'VASE-G', values: ['Grand'], price: 5400, stock: 2 },
        ],
      },
      {
        title: 'Plaid en lin',
        brand: 'Lumière & Co',
        description: 'Lin lavé, 130 × 170 cm.',
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
        kind: 'PHONE',
        attributes: {
          model: 'iPhone 12',
          screenSize: 6.1,
          screenTech: 'OLED Super Retina XDR',
          processor: 'A14 Bionic',
          ram: '4 Go',
          camera: 'Double 12 Mpx',
          battery: '2 815 mAh',
          os: 'iOS 17',
          network5g: true,
          dualSim: true,
          warrantyMonths: 12,
          inTheBox: ['Câble USB-C', 'Documentation'],
        },
        options: [
          { name: 'Stockage', type: 'storage', values: ['128 Go', '256 Go'] },
          { name: 'Couleur', type: 'color', values: ['Bleu', 'Noir', 'Violet', 'Rouge'], swatches: { Bleu: '#2D4E6F', Violet: '#B7AFE6' } },
          { name: 'État', type: 'condition', values: ['Neuf', 'Reconditionné – Excellent'] },
        ],
        variants: [
          { sku: 'IP12-128-BL-N', values: ['128 Go', 'Bleu', 'Neuf'], price: 320000, stock: 3 },
          { sku: 'IP12-256-BL-N', values: ['256 Go', 'Bleu', 'Neuf'], price: 365000, stock: 1 },
          { sku: 'IP12-128-NO-N', values: ['128 Go', 'Noir', 'Neuf'], price: 320000, stock: 4 },
          { sku: 'IP12-128-VI-R', values: ['128 Go', 'Violet', 'Reconditionné – Excellent'], price: 245000, compareAt: 320000, stock: 2 },
          { sku: 'IP12-256-NO-R', values: ['256 Go', 'Noir', 'Reconditionné – Excellent'], price: 280000, compareAt: 365000, stock: 1 },
          { sku: 'IP12-128-RO-N', values: ['128 Go', 'Rouge', 'Neuf'], price: 320000, stock: 0 },
        ],
        accessories: ['Écouteurs sans fil'],
      },
      {
        title: 'Galaxy A54',
        brand: 'Samsung',
        description: 'Écran Super AMOLED 120 Hz de 6,4 pouces, triple appareil photo 50 Mpx, 5G.',
        kind: 'PHONE',
        attributes: {
          model: 'Galaxy A54',
          screenSize: 6.4,
          screenTech: 'Super AMOLED 120 Hz',
          processor: 'Exynos 1380',
          ram: '8 Go',
          camera: 'Triple 50 Mpx',
          battery: '5 000 mAh',
          os: 'Android 14',
          network5g: true,
          dualSim: true,
          warrantyMonths: 24,
        },
        options: [
          { name: 'Stockage', type: 'storage', values: ['128 Go', '256 Go'] },
          { name: 'Couleur', type: 'color', values: ['Noir', 'Violet'] },
        ],
        variants: [
          { sku: 'A54-128-NO', values: ['128 Go', 'Noir'], price: 215000, stock: 6 },
          { sku: 'A54-128-VI', values: ['128 Go', 'Violet'], price: 215000, stock: 3 },
          { sku: 'A54-256-NO', values: ['256 Go', 'Noir'], price: 245000, stock: 2 },
        ],
      },
      {
        title: 'Chargeur 20 W USB-C',
        brand: 'Apple',
        description: 'Charge rapide : 50 % en 30 minutes.',
        kind: 'ACCESSORY',
        attributes: {
          accessoryType: 'CHARGER',
          compatibleModels: ['iPhone 12', 'iPhone 13', 'Galaxy A54'],
          connector: 'USB-C',
          power: 20,
          warrantyMonths: 12,
        },
        variants: [{ sku: 'CHG-20W', price: 15000, stock: 30 }],
      },
      {
        title: 'Coque MagSafe iPhone 12',
        brand: 'Apple',
        description: 'Silicone doux, aimants MagSafe intégrés.',
        kind: 'ACCESSORY',
        attributes: { accessoryType: 'CASE', compatibleModels: ['iPhone 12'], connector: 'MagSafe' },
        options: [{ name: 'Couleur', type: 'color', values: ['Noir', 'Bleu', 'Rouge'] }],
        variants: [
          { sku: 'COQ-12-NO', values: ['Noir'], price: 9000, stock: 10 },
          { sku: 'COQ-12-BL', values: ['Bleu'], price: 9000, stock: 6 },
          { sku: 'COQ-12-RO', values: ['Rouge'], price: 9000, stock: 2 },
        ],
      },
      {
        title: 'Écouteurs sans fil',
        brand: 'Volta Audio',
        description: 'Réduction de bruit active, 24 heures d’autonomie avec l’étui.',
        kind: 'ACCESSORY',
        attributes: { accessoryType: 'EARPHONES', connector: 'Bluetooth', wireless: true, warrantyMonths: 12 },
        variants: [{ sku: 'ECO-ANC', price: 35000, compareAt: 42000, stock: 12 }],
      },
      {
        title: 'Casque Studio',
        brand: 'Volta Audio',
        description: 'Casque arceau, 40 heures d’autonomie.',
        kind: 'ACCESSORY',
        attributes: { accessoryType: 'HEADPHONES', connector: 'Bluetooth', wireless: true, warrantyMonths: 24 },
        options: [{ name: 'Couleur', type: 'color', values: ['Noir', 'Blanc'] }],
        variants: [
          { sku: 'CAS-NO', values: ['Noir'], price: 55000, stock: 4 },
          { sku: 'CAS-BL', values: ['Blanc'], price: 55000, stock: 2 },
        ],
      },
      {
        title: 'Enceinte Nomade',
        brand: 'Volta Audio',
        description: 'Étanche IP67, 12 heures de musique.',
        kind: 'ACCESSORY',
        attributes: { accessoryType: 'SPEAKER', connector: 'Bluetooth', wireless: true, power: 20 },
        variants: [{ sku: 'ENC-NOM', price: 28000, stock: 8 }],
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

async function seedStore(seed: SeedStore, clerkOrgId: string, ownerId: string): Promise<void> {
  if (await prisma.store.findUnique({ where: { slug: seed.slug } })) {
    console.log(`• ${seed.name} existe déjà : ignorée`);
    return;
  }
  const storeId = uuidv7();
  await prisma.$transaction(async (tx) => {
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

    const brandIds = new Map<string, string>();
    for (const name of seed.brands) {
      const id = uuidv7();
      brandIds.set(name, id);
      await tx.brand.create({ data: { id, storeId, name, slug: slugify(name) } });
    }

    const productIds = new Map<string, string>();
    for (const product of seed.products) {
      const productId = uuidv7();
      productIds.set(product.title, productId);
      await tx.product.create({
        data: {
          id: productId,
          storeId,
          brandId: product.brand ? (brandIds.get(product.brand) ?? null) : null,
          title: product.title,
          slug: slugify(product.title),
          description: product.description,
          status: 'ACTIVE',
          kind: product.kind ?? null,
          attributes: (product.attributes ?? {}) as Prisma.InputJsonValue,
          options: (product.options ?? []) as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });
      for (const [position, variant] of product.variants.entries()) {
        const variantId = uuidv7();
        const values = variant.values ?? [];
        await tx.productVariant.create({
          data: {
            id: variantId,
            storeId,
            productId,
            sku: variant.sku,
            title: values.length ? values.join(' / ') : 'Par défaut',
            optionValues: values,
            priceAmount: variant.price,
            compareAtAmount: variant.compareAt ?? null,
            position,
          },
        });
        await tx.inventoryLevel.create({ data: { variantId, storeId, onHand: variant.stock } });
        if (variant.stock > 0) {
          await tx.stockMovement.create({
            data: { storeId, variantId, type: 'INITIAL', quantity: variant.stock, onHandAfter: variant.stock },
          });
        }
      }
    }

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
  });
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
