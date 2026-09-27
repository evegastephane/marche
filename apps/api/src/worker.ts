import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { loadConfig, loadDotEnv } from './shared/infrastructure/config/app-config.js';
import { ObserveInstrument } from './shared/infrastructure/observe/observe.js';
import { WorkerModule } from './worker.module.js';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const config = loadConfig();
  const app = await NestFactory.createApplicationContext(WorkerModule.forRoot(config), {
    bufferLogs: true,
    ...(config.observe ? { instrument: ObserveInstrument } : {}),
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.get(Logger).log('Worker démarré : relais de l’outbox et files BullMQ actifs', 'Bootstrap');
}

await bootstrap();
