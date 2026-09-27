import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module.js';
import { ClerkWebhookHandler } from './application/clerk-webhook.handler.js';
import { AccessTokenVerifier, UserDirectory } from './application/identity.ports.js';
import { LocalUserService } from './application/local-user.service.js';
import { UserRepository } from './domain/user.repository.js';
import { ClerkAccessTokenVerifier, ClerkUserDirectory } from './infrastructure/clerk-adapters.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { ClerkWebhooksController } from './interface/clerk-webhooks.controller.js';
import { ClerkAuthGuard, RolesGuard, TenantGuard } from './interface/guards.js';

/** Identité : jetons Clerk, utilisateurs locaux, guards et webhooks. */
@Module({
  imports: [StoresModule],
  controllers: [ClerkWebhooksController],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: AccessTokenVerifier, useClass: ClerkAccessTokenVerifier },
    { provide: UserDirectory, useClass: ClerkUserDirectory },
    LocalUserService,
    ClerkWebhookHandler,
    ClerkAuthGuard,
    TenantGuard,
    RolesGuard,
  ],
  exports: [ClerkAuthGuard, TenantGuard, RolesGuard, AccessTokenVerifier, UserDirectory],
})
export class IdentityModule {}
