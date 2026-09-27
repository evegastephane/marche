import { createObserveModule } from '@nestjs/observe';
import type { AppConfig } from '../config/app-config.js';

/** @nestjs/observe (fourni par le scaffold) : activé seulement si les clés sont configurées. */
export const { ObserveModule, ObserveInstrument } = createObserveModule();

export function observeModules(config: AppConfig, serviceId: string) {
  return config.observe
    ? [
        ObserveModule.forRoot({
          appKey: config.observe.appKey,
          appSecret: config.observe.appSecret,
          serviceId,
        }),
      ]
    : [];
}
