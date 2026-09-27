import { v7 as uuidv7 } from 'uuid';

/** Identifiant UUIDv7 (ordonné dans le temps), généré par le domaine. */
export function newId(): string {
  return uuidv7();
}
