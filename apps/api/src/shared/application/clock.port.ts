/** Horloge injectable : rend les use cases testables (dates déterministes). */
export abstract class Clock {
  abstract now(): Date;
}
