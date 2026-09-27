import { newId } from './id.js';

/** Enveloppe d'un événement de domaine (docs/PLAN-CODE.md §2.3). */
export interface DomainEvent<P = unknown> {
  readonly id: string;
  /** '<module>.<agrégat>.<verbe-au-passé>', ex. 'orders.order.placed'. */
  readonly type: string;
  readonly storeId: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: P;
}

/** Forme d'un événement après passage par l'outbox et BullMQ (dates sérialisées). */
export interface SerializedDomainEvent<P = unknown> {
  readonly id: string;
  readonly type: string;
  readonly storeId: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly payload: P;
}

export function createEvent<P>(
  type: string,
  storeId: string,
  aggregateId: string,
  payload: P,
  occurredAt: Date = new Date(),
): DomainEvent<P> {
  return { id: newId(), type, storeId, aggregateId, occurredAt, payload };
}
