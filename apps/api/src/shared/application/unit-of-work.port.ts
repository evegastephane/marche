/**
 * Unité de travail (docs/ARCHITECTURE.md §5.4) : tout ce qui s'exécute dans `run`
 * partage la même transaction, y compris à travers les façades des autres modules.
 * Un `run` imbriqué réutilise la transaction en cours.
 */
export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
