import { Global, Module } from '@nestjs/common';
import { Clock } from '../application/clock.port.js';
import { OutboxPort } from '../application/outbox.port.js';
import { JsonCache } from './cache/json-cache.js';
import { ClerkModule } from './clerk/clerk.module.js';
import { SystemClock } from './clock/system-clock.js';
import { TenantContextModule, createClsModule } from './cls/cls.module.js';
import type { AppConfig } from './config/app-config.js';
import { ConfigModule } from './config/config.module.js';
import { createLoggerModule } from './logging/logger.module.js';
import { PrismaOutboxRepository } from './outbox/prisma-outbox.repository.js';
import { PrismaModule, UnitOfWorkModule } from './prisma/prisma.module.js';
import { createQueueModules } from './queue/queue.module.js';
import { RedisModule } from './redis/redis.module.js';

/** Services techniques partagés, disponibles dans tous les modules. */
@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: OutboxPort, useClass: PrismaOutboxRepository },
    JsonCache,
  ],
  exports: [Clock, OutboxPort, JsonCache],
})
export class SharedServicesModule {}

/** Socle commun à l'API et au worker. */
export function coreModules(config: AppConfig, options: { http: boolean }) {
  return [
    ConfigModule.forRoot(config),
    createLoggerModule(config),
    createClsModule({ mountMiddleware: options.http }),
    TenantContextModule,
    PrismaModule,
    UnitOfWorkModule,
    RedisModule,
    ClerkModule,
    ...createQueueModules(),
    SharedServicesModule,
  ];
}
