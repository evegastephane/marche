import type { DomainEvent } from '../domain/domain-event.js';

/**
 * Transactional Outbox : les événements sont écrits dans la même transaction que les données,
 * puis publiés dans BullMQ par le relais du worker.
 */
export abstract class OutboxPort {
  abstract addAll(events: readonly DomainEvent[]): Promise<void>;
}
