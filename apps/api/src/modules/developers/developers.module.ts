import { Module } from '@nestjs/common';
import { DynamicCorsOrigins } from '../../shared/infrastructure/http/dynamic-cors.js';
import { ApiKeyAuthenticator } from './application/api-key-authenticator.js';
import { ApiKeyRepository } from './application/api-keys.ports.js';
import { ApiKeyUseCases } from './application/api-keys.use-cases.js';
import { PrismaApiKeyRepository } from './infrastructure/prisma-api-keys.repository.js';
import { ApiKeysController } from './interface/api-keys.controller.js';

/** Partie Développeurs : clés pk_ (sites et applications tiers) et sk_ (serveurs). */
@Module({
  controllers: [ApiKeysController],
  providers: [
    { provide: ApiKeyRepository, useClass: PrismaApiKeyRepository },
    ApiKeyAuthenticator,
    // CORS de /storefront/v1 : origines déclarées sur les clés pk_ (http-setup.ts).
    { provide: DynamicCorsOrigins, useExisting: ApiKeyAuthenticator },
    ApiKeyUseCases,
  ],
  exports: [ApiKeyAuthenticator, DynamicCorsOrigins],
})
export class DevelopersModule {}
