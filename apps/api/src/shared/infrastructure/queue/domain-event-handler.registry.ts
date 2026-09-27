import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { SerializedDomainEvent } from '../../domain/domain-event.js';
import {
  DOMAIN_EVENT_HANDLER,
  type DomainEventHandlerOptions,
} from './on-domain-event.decorator.js';
import type { EventQueueName } from './queues.js';

export interface EventRoute {
  queue: EventQueueName;
  name: string;
  attempts?: number;
}

type Handler = (event: SerializedDomainEvent) => Promise<unknown>;

/**
 * Découvre au démarrage du worker les méthodes annotées @OnDomainEvent (Mediator) :
 * - le relais y lit les routes « événement → jobs » ;
 * - les processeurs de files y trouvent le code à exécuter pour chaque job.
 */
@Injectable()
export class DomainEventHandlerRegistry implements OnModuleInit {
  private readonly logger = new Logger(DomainEventHandlerRegistry.name);
  private readonly routes = new Map<string, EventRoute[]>();
  private readonly handlers = new Map<string, Handler>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (!instance || typeof instance !== 'object' || !wrapper.isDependencyTreeStatic()) continue;
      const prototype = Object.getPrototypeOf(instance) as object;
      for (const methodName of this.scanner.getAllMethodNames(prototype)) {
        const method = (instance as Record<string, unknown>)[methodName];
        if (typeof method !== 'function') continue;
        const options = this.reflector.get<DomainEventHandlerOptions | undefined>(
          DOMAIN_EVENT_HANDLER,
          method,
        );
        if (options) this.register(options, (event) => method.call(instance, event) as Promise<unknown>);
      }
    }
    this.logger.log(
      `${this.handlers.size} abonnés à ${this.routes.size} types d’événements enregistrés`,
    );
  }

  register(options: DomainEventHandlerOptions, handler: Handler): void {
    const key = DomainEventHandlerRegistry.key(options.queue, options.name);
    if (this.handlers.has(key)) {
      throw new Error(`Abonné en double pour le job ${key}`);
    }
    this.handlers.set(key, handler);
    const routes = this.routes.get(options.event) ?? [];
    routes.push({ queue: options.queue, name: options.name, attempts: options.attempts });
    this.routes.set(options.event, routes);
  }

  routesFor(eventType: string): readonly EventRoute[] {
    return this.routes.get(eventType) ?? [];
  }

  handlerFor(queue: EventQueueName, jobName: string): Handler | undefined {
    return this.handlers.get(DomainEventHandlerRegistry.key(queue, jobName));
  }

  private static key(queue: string, name: string): string {
    return `${queue}/${name}`;
  }
}
