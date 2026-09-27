import type { DomainEvent } from './domain-event.js';

/** Racine d'agrégat : porte l'identité, la version (verrou optimiste) et les événements à publier. */
export abstract class AggregateRoot {
  #events: DomainEvent[] = [];

  protected constructor(
    readonly id: string,
    protected _version = 0,
  ) {}

  get version(): number {
    return this._version;
  }

  protected record(event: DomainEvent): void {
    this.#events.push(event);
  }

  /** Retourne et vide les événements en attente (à écrire dans l'outbox). */
  pullEvents(): DomainEvent[] {
    return this.#events.splice(0);
  }

  /** Appelé par le repository après une écriture réussie. */
  markPersisted(): void {
    this._version += 1;
  }
}
