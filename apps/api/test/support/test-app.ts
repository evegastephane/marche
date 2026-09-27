import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';
import { inject } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { WorkerModule } from '../../src/worker.module.js';
import { StorefrontRevalidator } from '../../src/modules/sites/application/sites.ports.js';
import { UserDirectory } from '../../src/modules/identity/application/identity.ports.js';
import { ObjectStorage } from '../../src/modules/media/application/media.ports.js';
import { EmailSender } from '../../src/modules/notifications/application/email.port.js';
import { OrganizationDirectory } from '../../src/modules/stores/application/organization-directory.port.js';
import { type AppConfig, loadConfig } from '../../src/shared/infrastructure/config/app-config.js';
import { configureHttpApp } from '../../src/shared/infrastructure/http/http-setup.js';
import {
  FakeOrganizationDirectory,
  FakeUserDirectory,
  InMemoryEmailSender,
  InMemoryObjectStorage,
  RecordingRevalidator,
} from './fakes.js';

export const AUTHORIZED_PARTY = 'http://localhost:5173';
export const STOREFRONT_TOKEN = 'storefront-token-for-tests-0123456789';

let keys: Promise<{ privateKey: CryptoKey; publicPem: string }> | undefined;

function signingKeys() {
  keys ??= generateKeyPair('RS256', { extractable: true }).then(async ({ privateKey, publicKey }) => ({
    privateKey,
    publicPem: await exportSPKI(publicKey),
  }));
  return keys;
}

export function testEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: inject('databaseUrl'),
    REDIS_URL: inject('redisUrl'),
    CLERK_AUTHORIZED_PARTIES: AUTHORIZED_PARTY,
    CLERK_WEBHOOK_SIGNING_SECRET: `whsec_${randomBytes(24).toString('base64')}`,
    S3_ENDPOINT: 'http://localhost:1',
    S3_BUCKET: 'test-bucket',
    S3_ACCESS_KEY_ID: 'test',
    S3_SECRET_ACCESS_KEY: 'test',
    MEDIA_PUBLIC_BASE_URL: 'http://media.test',
    EMAIL_PROVIDER: 'log',
    STOREFRONT_API_TOKEN: STOREFRONT_TOKEN,
    STOREFRONT_INTERNAL_URL: 'http://storefront.test',
    REVALIDATE_SECRET: 'revalidate-secret-for-tests-0123',
    PREVIEW_TOKEN_SECRET: 'preview-secret-for-tests-0123456',
    PLATFORM_ROOT_DOMAIN: 'marche.test',
    SITE_URL_SCHEME: 'https',
    RATE_LIMIT_PER_MINUTE: '100000',
    ...overrides,
  };
}

export interface TestApp {
  app: INestApplication;
  moduleRef: TestingModule;
  config: AppConfig;
  organizations: FakeOrganizationDirectory;
  storage: InMemoryObjectStorage;
  emails: InMemoryEmailSender;
  /** Jeton de session Clerk signé avec la clé de test. */
  token(claims: { sub: string; orgId?: string; orgRole?: 'admin' | 'member' }): Promise<string>;
  http(): ReturnType<typeof request>;
  close(): Promise<void>;
}

export async function createTestApp(envOverrides: Record<string, string> = {}): Promise<TestApp> {
  const { privateKey, publicPem } = await signingKeys();
  const config = loadConfig(testEnv({ CLERK_JWT_KEY: publicPem, ...envOverrides }));
  const organizations = new FakeOrganizationDirectory();
  const storage = new InMemoryObjectStorage();
  const emails = new InMemoryEmailSender();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
    .overrideProvider(OrganizationDirectory)
    .useValue(organizations)
    .overrideProvider(UserDirectory)
    .useValue(new FakeUserDirectory())
    .overrideProvider(ObjectStorage)
    .useValue(storage)
    .overrideProvider(EmailSender)
    .useValue(emails)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true, logger: false });
  configureHttpApp(app, config);
  // Écoute réelle : supertest réutilise le port au lieu d'en ouvrir un par requête.
  await app.listen(0, '127.0.0.1');

  return {
    app,
    moduleRef,
    config,
    organizations,
    storage,
    emails,
    token: ({ sub, orgId, orgRole }) => {
      const now = Math.floor(Date.now() / 1000);
      return new SignJWT({
        azp: AUTHORIZED_PARTY,
        v: 2,
        ...(orgId ? { o: { id: orgId, rol: orgRole ?? 'admin', slg: 'test' } } : {}),
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setSubject(sub)
        .setIssuer('https://clerk.test')
        .setIssuedAt(now - 5)
        .setNotBefore(now - 5)
        .setExpirationTime(now + 300)
        .sign(privateKey);
    },
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
  };
}

/** Crée une boutique via l'API et renvoie un jeton porteur de son organisation. */
export async function createStoreFor(
  testApp: TestApp,
  input: { slug: string; name?: string; currency?: string; country?: string; userId?: string },
): Promise<{ token: string; storeId: string; userId: string }> {
  const userId = input.userId ?? `user_${randomBytes(6).toString('hex')}`;
  const bootstrapToken = await testApp.token({ sub: userId });
  const response = await testApp
    .http()
    .post('/api/v1/stores')
    .set('Authorization', `Bearer ${bootstrapToken}`)
    .send({
      name: input.name ?? `Boutique ${input.slug}`,
      slug: input.slug,
      currency: input.currency ?? 'EUR',
      country: input.country ?? 'FR',
    });
  if (response.status !== 201) {
    throw new Error(`Création de boutique impossible : ${response.status} ${JSON.stringify(response.body)}`);
  }
  const token = await testApp.token({ sub: userId, orgId: testApp.organizations.orgIdFor(input.slug) });
  return { token, storeId: response.body.id as string, userId };
}

export function uniqueSlug(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`;
}

export interface TestWorker {
  moduleRef: TestingModule;
  emails: InMemoryEmailSender;
  revalidator: RecordingRevalidator;
  close(): Promise<void>;
}

/**
 * Worker de test (relais de l'outbox + files BullMQ) partageant la configuration
 * et le stockage de l'API de test.
 */
export async function createTestWorker(api: TestApp): Promise<TestWorker> {
  const emails = new InMemoryEmailSender();
  const revalidator = new RecordingRevalidator();
  const moduleRef = await Test.createTestingModule({ imports: [WorkerModule.forRoot(api.config)] })
    .overrideProvider(OrganizationDirectory)
    .useValue(api.organizations)
    .overrideProvider(UserDirectory)
    .useValue(new FakeUserDirectory())
    .overrideProvider(ObjectStorage)
    .useValue(api.storage)
    .overrideProvider(EmailSender)
    .useValue(emails)
    .overrideProvider(StorefrontRevalidator)
    .useValue(revalidator)
    .compile();
  moduleRef.useLogger(false);
  await moduleRef.init();
  return { moduleRef, emails, revalidator, close: () => moduleRef.close() };
}

/** Attend qu'une condition devienne vraie (jobs asynchrones du worker). */
export async function eventually<T>(
  probe: () => T | Promise<T>,
  timeoutMs = 15_000,
): Promise<NonNullable<T>> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value) return value as NonNullable<T>;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Condition non atteinte en ${timeoutMs} ms${lastError instanceof Error ? ` : ${lastError.message}` : ''}`);
}

/** Crée et publie un produit simple (une variante) ; renvoie ses identifiants. */
export async function createPublishedProduct(
  t: TestApp,
  token: string,
  input: { title: string; sku: string; priceAmount: number; stock?: number; trackInventory?: boolean },
): Promise<{ productId: string; variantId: string; slug: string }> {
  const created = await t
    .http()
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: input.title,
      variants: [
        {
          sku: input.sku,
          priceAmount: input.priceAmount,
          initialQuantity: input.stock ?? 0,
          trackInventory: input.trackInventory ?? true,
        },
      ],
    });
  if (created.status !== 201) throw new Error(`Produit non créé : ${JSON.stringify(created.body)}`);
  const published = await t
    .http()
    .post(`/api/v1/products/${created.body.id}/publish`)
    .set('Authorization', `Bearer ${token}`);
  if (published.status !== 200) throw new Error(`Produit non publié : ${JSON.stringify(published.body)}`);
  return { productId: created.body.id, variantId: created.body.variants[0].id, slug: created.body.slug };
}
