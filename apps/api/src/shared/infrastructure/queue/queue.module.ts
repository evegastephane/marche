import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import type { QueueOptions } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queues.js';

const registeredQueues = BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name })));

/** Les files sont injectables partout (@InjectQueue), dans l'API comme dans le worker. */
@Global()
@Module({
  imports: [registeredQueues],
  exports: [registeredQueues],
})
export class QueuesModule {}

/** Connexion BullMQ + déclaration des files (producteurs). Les processeurs ne vivent que dans le worker. */
export function createQueueModules() {
  return [
    BullModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): QueueOptions => ({
        // maxRetriesPerRequest: null est obligatoire pour les workers (commandes bloquantes).
        connection: { url: config.redisUrl, maxRetriesPerRequest: null },
        prefix: 'marche',
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    QueuesModule,
  ];
}
