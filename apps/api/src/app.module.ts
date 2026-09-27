import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DOMAIN_MODULES } from './modules/domain-modules.js';
import { ClerkAuthGuard, RolesGuard, TenantGuard } from './modules/identity/interface/guards.js';
import type { AppConfig } from './shared/infrastructure/config/app-config.js';
import { coreModules } from './shared/infrastructure/core.module.js';
import { HealthController } from './shared/infrastructure/health/health.controller.js';
import { basicAuth } from './shared/infrastructure/http/basic-auth.middleware.js';
import { ProblemDetailsFilter } from './shared/infrastructure/http/problem-details.js';
import { observeModules } from './shared/infrastructure/observe/observe.js';
import { QUEUE_NAMES } from './shared/infrastructure/queue/queues.js';
import { createThrottlingModule } from './shared/infrastructure/throttling/throttling.module.js';

function bullBoardModules(config: AppConfig) {
  if (!config.bullBoard) return [];
  return [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      middleware: basicAuth(config.bullBoard.user, config.bullBoard.password),
    }),
    BullBoardModule.forFeature(...QUEUE_NAMES.map((name) => ({ name, adapter: BullMQAdapter }))),
  ];
}

/** Processus HTTP : API d'administration, API storefront, webhooks, santé. */
@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ...coreModules(config, { http: true }),
        createThrottlingModule(),
        ...observeModules(config, 'api'),
        ...bullBoardModules(config),
        ...DOMAIN_MODULES,
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        // Ordre des guards (docs/PLAN-CODE.md §6.4) : débit → authentification → boutique → rôles.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useExisting: ClerkAuthGuard },
        { provide: APP_GUARD, useExisting: TenantGuard },
        { provide: APP_GUARD, useExisting: RolesGuard },
      ],
    };
  }
}
