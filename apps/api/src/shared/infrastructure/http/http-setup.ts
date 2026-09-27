import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { AppConfig } from '../config/app-config.js';

/** Réglages HTTP communs à main.ts et aux tests e2e. */
export function configureHttpApp(app: NestExpressApplication, config: AppConfig): void {
  // Derrière un proxy (Railway, Render…) : l'IP du client vient de X-Forwarded-For.
  if (config.isProduction) app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '1mb' });
  // API JSON : la CSP ne concerne que Swagger et Bull Board, qui chargent leurs propres scripts.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: config.cors.origins,
    credentials: false,
    exposedHeaders: ['x-request-id', 'idempotent-replayed', 'retry-after'],
  });
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Marché — API')
      .setDescription(
        'API d’administration (/api/v1, jeton Clerk) et API storefront (/storefront/v1, serveur à serveur).',
      )
      .setVersion('0.1')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}
