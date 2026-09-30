import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import type { Request } from 'express';
import helmet from 'helmet';
import { PUBLISHABLE_KEY_HEADER } from '@marche/contracts';
import type { AppConfig } from '../config/app-config.js';
import { DynamicCorsOrigins } from './dynamic-cors.js';

const STOREFRONT_PREFIX = '/storefront/v1';

/** Réglages HTTP communs à main.ts et aux tests e2e. */
export function configureHttpApp(app: NestExpressApplication, config: AppConfig): void {
  // Derrière un proxy (Railway, Render…) : l'IP du client vient de X-Forwarded-For.
  if (config.isProduction) app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '1mb' });
  // API JSON : la CSP ne concerne que Swagger et Bull Board, qui chargent leurs propres scripts.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const dynamic = app.get(DynamicCorsOrigins, { strict: false });
  const base: CorsOptions = {
    credentials: false,
    exposedHeaders: ['x-request-id', 'idempotent-replayed', 'retry-after'],
    maxAge: 600,
  };
  // CORS_ORIGINS (dashboard, sites Upsell) partout ; en plus, sur /storefront/v1 seulement, les origines
  // déclarées sur une clé pk_ active. La clé elle-même est vérifiée ensuite par StorefrontGuard.
  app.enableCors((request: Request, callback: (error: Error | null, options: CorsOptions) => void) => {
    const origin = request.header('origin');
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, { ...base, origin: origin ?? false });
      return;
    }
    if (!(request.originalUrl ?? request.url).startsWith(STOREFRONT_PREFIX)) {
      callback(null, { ...base, origin: false });
      return;
    }
    dynamic
      .isAllowedOrigin(origin)
      .then((allowed) => callback(null, { ...base, origin: allowed ? origin : false }))
      .catch(() => callback(null, { ...base, origin: false }));
  });
  app.enableShutdownHooks();
}

/**
 * Référence des API, servie aussi en production pour les développeurs des boutiques :
 * /docs (interface) et /openapi.json (document OpenAPI, pour générer un client typé).
 */
export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Upsell — API')
      .setDescription(
        [
          'Deux API, trois façons de s’identifier.',
          '',
          '- **/api/v1** (administration) : `Authorization: Bearer <jeton>`, soit le jeton de session du dashboard, soit une **clé secrète `sk_…`** créée dans Développeurs. Une clé secrète ne s’utilise que depuis un serveur, avec ses droits (catalog, inventory, orders, customers ; lecture ou écriture).',
          `- **/storefront/v1** (vitrine) : en-tête \`${PUBLISHABLE_KEY_HEADER}: pk_…\`, une **clé publique** utilisable depuis le navigateur, limitée aux origines déclarées sur la clé.`,
          '',
          'Erreurs au format problem+json (RFC 9457) avec un `code` stable ; listes paginées par curseur (`cursor`, `limit`, `nextCursor`) ; `Idempotency-Key` obligatoire pour passer une commande.',
        ].join('\n'),
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', description: 'Jeton de session du dashboard, ou clé secrète sk_…' })
      .addApiKey(
        { type: 'apiKey', in: 'header', name: PUBLISHABLE_KEY_HEADER, description: 'Clé publique pk_… (navigateur)' },
        'publishable-key',
      )
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
    customSiteTitle: 'Upsell — Référence des API',
  });
}
