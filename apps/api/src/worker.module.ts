import { type DynamicModule, Module } from '@nestjs/common';
import { DOMAIN_MODULES } from './modules/domain-modules.js';
import type { AppConfig } from './shared/infrastructure/config/app-config.js';
import { coreModules } from './shared/infrastructure/core.module.js';
import { observeModules } from './shared/infrastructure/observe/observe.js';
import { QueueWorkersModule } from './shared/infrastructure/queue/queue-workers.module.js';

/** Processus worker : relais de l'outbox et traitement des files BullMQ. */
@Module({})
export class WorkerModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        ...coreModules(config, { http: false }),
        ...observeModules(config, 'worker'),
        ...DOMAIN_MODULES,
        QueueWorkersModule,
      ],
    };
  }
}
