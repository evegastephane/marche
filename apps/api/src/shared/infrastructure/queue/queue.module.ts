import { Global, Injectable, Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import type { Queue, QueueOptions } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { reportRedisError } from '../redis/connection-errors.js';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queues.js';

const registeredQueues = BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name })));

/** Écoute les erreurs de connexion de chaque file : sans écouteur, BullMQ les écrit brutes dans la console. */
@Injectable()
class QueueErrorListener implements OnModuleInit {
  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    for (const name of QUEUE_NAMES) {
      const queue = this.moduleRef.get<Queue>(getQueueToken(name), { strict: false });
      queue.on('error', (error) => reportRedisError(`file ${name}`, error));
    }
  }
}

/** Les files sont injectables partout (@InjectQueue), dans l'API comme dans le worker. */
@Global()
@Module({
  imports: [registeredQueues],
  providers: [QueueErrorListener],
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
