/**
 * Données de démonstration (docs/PLAN-CODE.md §5.2) : 2 boutiques (EUR et XOF), marques, produits,
 * stock, catalogues et site généré. Idempotent : une boutique déjà présente est ignorée.
 *
 * SEED_CLERK_ORG_ID (optionnel) : rattache la première boutique à votre organisation Clerk de dev,
 * pour la retrouver dans le dashboard une fois connecté.
 */
import { DEFAULT_SHIPPING_SETTINGS, defaultTemplateManifest, defaultTemplateSettings } from '@marche/contracts';
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
  options?: { name: string; values: string[] }[];
  variants: { sku: string; values?: string[]; price: number; compareAt?: number; stock: number }[];
}

interface SeedStore {
  slug: string;
  name: string;
  currency: 'EUR' | 'XOF';
  country: string;
  timezone: string;
  shipping: Prisma.InputJsonValue;
  brands: string[];
  collections: { title: string; products: string[] }[];
  products: SeedProduct[];
}

const STORES: SeedStore[] = [
  {
    slug: 'chez-awa',
    name: 'Chez Awa',
    currency: 'XOF',
    country: 'SN',
    timezone: 'Africa/Dakar',
    shipping: { strategy: 'FREE_OVER_THRESHOLD', flatRateAmount: 2000, thresholdAmount: 50000 },
    brands: ['Wax Élégance', 'Atelier Ndar'],
    collections: [
      { title: 'Nouveautés', products: ['Boubou brodé', 'Pagne wax', 'Sac en raphia'] },
      { title: 'Accessoires', products: ['Sac en raphia', 'Bracelet perles'] },
    ],
    products: [
      {
        title: 'Boubou brodé',
        brand: 'Atelier Ndar',
        description: 'Boubou en bazin brodé main, coupe ample.',
        options: [
          { name: 'Taille', values: ['M', 'L', 'XL'] },
          { name: 'Couleur', values: ['Bleu nuit', 'Or'] },
        ],
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
        variants: [{ sku: 'SAC-RAPH', price: 18000, stock: 7 }],
      },
      {
        title: 'Bracelet perles',
        description: 'Perles de verre recyclé.',
        options: [{ name: 'Couleur', values: ['Rouge', 'Turquoise'] }],
        variants: [
          { sku: 'BRA-RGE', values: ['Rouge'], price: 5000, stock: 12 },
          { sku: 'BRA-TRQ', values: ['Turquoise'], price: 5000, stock: 3 },
        ],
      },
    ],
  },
  {
    slug: 'maison-lumiere',
    name: 'Maison Lumière',
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
              productId: productIds.get(title) as string,
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
  console.log(`✓ ${seed.name} (${seed.currency}) : ${seed.products.length} produits, site publié`);
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
