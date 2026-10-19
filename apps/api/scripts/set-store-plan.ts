/**
 * Change la formule d'une boutique (en attendant le paiement en ligne) :
 *   npm run store:plan -w @marche/api -- <slug> premium|free
 * Premium débloque les modèles de site payants. Le cache des réglages est vidé et un événement
 * « stores.store.updated » part par l'outbox : le worker fait revalider le site public.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import { v7 as uuidv7 } from 'uuid';
import { PrismaClient, type StorePlan } from '../src/generated/prisma/client.js';
import { StoreCache } from '../src/modules/stores/infrastructure/store-cache.js';
import { loadConfig, loadDotEnv } from '../src/shared/infrastructure/config/app-config.js';

const PLANS: Record<string, StorePlan> = { premium: 'PREMIUM', free: 'FREE', gratuit: 'FREE' };

const [slug, wanted] = process.argv.slice(2);
const plan = wanted ? PLANS[wanted.toLowerCase()] : undefined;
if (!slug || !plan) {
  console.error('Usage : npm run store:plan -w @marche/api -- <slug> premium|free');
  process.exit(1);
}

loadDotEnv();
const config = loadConfig();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
const redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

try {
  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, name: true, plan: true } });
  if (!store) {
    console.error(`✗ Aucune boutique « ${slug} »`);
    process.exitCode = 1;
  } else if (store.plan === plan) {
    console.log(`• ${store.name} est déjà en formule ${plan === 'PREMIUM' ? 'Premium' : 'Gratuite'}`);
  } else {
    const now = new Date();
    await prisma.$transaction([
      prisma.store.update({ where: { id: store.id }, data: { plan } }),
      prisma.outboxEvent.create({
        data: {
          id: uuidv7(),
          storeId: store.id,
          type: 'stores.store.updated',
          aggregateId: store.id,
          payload: { changed: ['plan'] },
          occurredAt: now,
        },
      }),
    ]);
    try {
      await redis.connect();
      await redis.del(StoreCache.settingsKey(store.id));
    } catch {
      console.warn('• Redis injoignable : la nouvelle formule s’appliquera d’ici une minute (cache des réglages)');
    }
    console.log(`✓ ${store.name} passe en formule ${plan === 'PREMIUM' ? 'Premium' : 'Gratuite'}`);
  }
} finally {
  redis.disconnect();
  await prisma.$disconnect();
}
