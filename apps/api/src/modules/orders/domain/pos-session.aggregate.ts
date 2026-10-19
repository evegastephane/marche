import type { PosSessionStatus } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { ConflictError, ForbiddenError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export class PosSessionClosedError extends ConflictError {
  constructor() {
    super('POS_SESSION_CLOSED', 'Cette caisse est fermée : ouvrez une nouvelle session pour encaisser');
  }
}

export class PosSessionAlreadyOpenError extends ConflictError {
  constructor(sessionId?: string) {
    super('POS_SESSION_ALREADY_OPEN', 'Vous avez déjà une caisse ouverte : fermez-la avant d’en ouvrir une autre', sessionId ? { sessionId } : undefined);
  }
}

export class PosSessionNotYoursError extends ForbiddenError {
  constructor() {
    super('POS_SESSION_NOT_YOURS', 'Cette caisse a été ouverte par un autre vendeur');
  }
}

export interface PosSessionData {
  storeId: string;
  label: string | null;
  status: PosSessionStatus;
  openedByUserId: string;
  openingFloat: number;
  openedAt: Date;
  closedByUserId: string | null;
  closedAt: Date | null;
  expectedCash: number | null;
  countedCash: number | null;
  closingNote: string | null;
}

/**
 * Session de caisse : un vendeur ouvre sa caisse avec un fond, encaisse, puis la ferme en comptant
 * les espèces. Seul le vendeur qui l'a ouverte y encaisse ; un administrateur peut la fermer à sa place.
 */
export class PosSession extends AggregateRoot {
  private constructor(
    id: string,
    private data: PosSessionData,
    version = 0,
  ) {
    super(id, version);
  }

  static open(input: { storeId: string; userId: string; openingFloat: number; label?: string | null }, now: Date): PosSession {
    if (!Number.isSafeInteger(input.openingFloat) || input.openingFloat < 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Fond de caisse invalide');
    }
    return new PosSession(newId(), {
      storeId: input.storeId,
      label: input.label?.trim() || null,
      status: 'OPEN',
      openedByUserId: input.userId,
      openingFloat: input.openingFloat,
      openedAt: now,
      closedByUserId: null,
      closedAt: null,
      expectedCash: null,
      countedCash: null,
      closingNote: null,
    });
  }

  static reconstitute(id: string, data: PosSessionData, version: number): PosSession {
    return new PosSession(id, { ...data }, version);
  }

  get status(): PosSessionStatus {
    return this.data.status;
  }

  get openedByUserId(): string {
    return this.data.openedByUserId;
  }

  get openingFloat(): number {
    return this.data.openingFloat;
  }

  get label(): string | null {
    return this.data.label;
  }

  snapshot(): Readonly<PosSessionData> {
    return { ...this.data };
  }

  /** Encaisser, rembourser ou sortir des espèces : la caisse doit être ouverte, et à ce vendeur. */
  assertUsableBy(userId: string | null): void {
    if (this.data.status !== 'OPEN') throw new PosSessionClosedError();
    if (!userId || userId !== this.data.openedByUserId) throw new PosSessionNotYoursError();
  }

  /**
   * Fermeture : les espèces comptées sont comparées aux espèces attendues (calculées par le serveur).
   * Le vendeur ferme sa caisse ; un administrateur peut fermer celle d'un vendeur parti.
   */
  close(input: { userId: string; canCloseOthers: boolean; countedCash: number; expectedCash: number; note?: string | null }, now: Date): void {
    if (this.data.status !== 'OPEN') throw new PosSessionClosedError();
    if (input.userId !== this.data.openedByUserId && !input.canCloseOthers) throw new PosSessionNotYoursError();
    if (!Number.isSafeInteger(input.countedCash) || input.countedCash < 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Montant compté invalide');
    }
    this.data = {
      ...this.data,
      status: 'CLOSED',
      closedByUserId: input.userId,
      closedAt: now,
      expectedCash: input.expectedCash,
      countedCash: input.countedCash,
      closingNote: input.note?.trim() || null,
    };
  }
}
