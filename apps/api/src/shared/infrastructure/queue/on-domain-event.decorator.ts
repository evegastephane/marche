import { SetMetadata } from '@nestjs/common';
import type { EventQueueName } from './queues.js';

export interface DomainEventHandlerOptions {
  /** Type d'événement écouté, ex. 'orders.order.placed'. */
  event: string;
  /** File BullMQ qui exécute le traitement. */
  queue: EventQueueName;
  /** Nom du job, unique dans sa file (sert aussi à la déduplication). */
  name: string;
  attempts?: number;
}

export const DOMAIN_EVENT_HANDLER = 'marche:domain-event-handler';

/**
 * Abonne une méthode à un événement de domaine (pattern Observer).
 * Le relais de l'outbox crée un job par abonné : les retries sont indépendants.
 * La méthode reçoit l'événement sérialisé et doit être idempotente.
 */
export const OnDomainEvent = (options: DomainEventHandlerOptions): MethodDecorator =>
  SetMetadata(DOMAIN_EVENT_HANDLER, options);
