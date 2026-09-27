import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { loadConfig, loadDotEnv } from './shared/infrastructure/config/app-config.js';
import { configureHttpApp, setupSwagger } from './shared/infrastructure/http/http-setup.js';
import { ObserveInstrument } from './shared/infrastructure/observe/observe.js';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    rawBody: true, // signature des webhooks Clerk
    bufferLogs: true,
    ...(config.observe ? { instrument: ObserveInstrument } : {}),
  });
  app.useLogger(app.get(Logger));
  configureHttpApp(app, config);
  if (!config.isProduction) setupSwagger(app);
  await app.listen(config.port);
  app.get(Logger).log(`API démarrée sur le port ${config.port}`, 'Bootstrap');
}

await bootstrap();
