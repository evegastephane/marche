import { Global, Module } from '@nestjs/common';
import { type ClerkClient, createClerkClient } from '@clerk/backend';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

/** Client de la Backend API Clerk, ou null si CLERK_SECRET_KEY n'est pas configuré. */
export const CLERK_CLIENT = Symbol('CLERK_CLIENT');
export type MaybeClerkClient = ClerkClient | null;

export class ClerkNotConfiguredError extends Error {
  constructor() {
    super('Clerk n’est pas configuré (CLERK_SECRET_KEY manquant)');
    this.name = 'ClerkNotConfiguredError';
  }
}

@Global()
@Module({
  providers: [
    {
      provide: CLERK_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): MaybeClerkClient =>
        config.clerk.secretKey
          ? createClerkClient({ secretKey: config.clerk.secretKey, jwtKey: config.clerk.jwtKey })
          : null,
    },
  ],
  exports: [CLERK_CLIENT],
})
export class ClerkModule {}
