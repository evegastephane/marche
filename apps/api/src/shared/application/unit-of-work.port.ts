/**
 * Unité de travail (docs/ARCHITECTURE.md §5.4) : tout ce qui s'exécute dans `run`
 * partage la même transaction, y compris à travers les façades des autres modules.
 * Un `run` imbriqué réutilise la transaction en cours.
 */
export interface UnitOfWorkOptions {
  /** Durée maximale de la transaction (5 s par défaut) : à relever pour un traitement de masse (import). */
  timeoutMs?: number;
}

export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>, options?: UnitOfWorkOptions): Promise<T>;
}
