import type {
  AllocatedPayment,
  CashMovementType,
  OrderReturnDto,
  Paginated,
  PaymentKind,
  PaymentMethod,
  PosCreditDto,
  PosSaleListQuery,
  PosSaleSummaryDto,
  PosSessionDetailDto,
  PosSessionDto,
  PosSessionListQuery,
  PosSettings,
} from '@marche/contracts';
import type { PosSession } from '../domain/pos-session.aggregate.js';
import type { ReturnedSoFar } from '../domain/order-return.policy.js';

export abstract class PosSessionRepository {
  abstract findById(id: string): Promise<PosSession | null>;
  /** Session ouverte de ce vendeur, s'il en a une. */
  abstract findOpenByUser(userId: string): Promise<PosSession | null>;
  /** Lève PosSessionAlreadyOpenError si le vendeur a déjà une caisse ouverte (index partiel). */
  abstract insert(session: PosSession): Promise<void>;
  /** Lève ConcurrentModificationError si la version a changé entre-temps. */
  abstract update(session: PosSession): Promise<void>;
}

export interface NewPayment extends AllocatedPayment {
  kind: PaymentKind;
}

export interface NewReturn {
  id: string;
  orderId: string;
  sessionId: string;
  reason: string;
  restocked: boolean;
  refundAmount: number;
  refundMethod: PaymentMethod;
  creditRemaining: number;
  lines: { orderLineId: string; quantity: number; amount: number; serials: string[] }[];
}

/** Écritures de la caisse : encaissements, mouvements d'espèces, retours et avoirs. */
export abstract class PosLedger {
  abstract addPayments(input: { orderId: string; sessionId: string | null; userId: string | null; payments: readonly NewPayment[] }): Promise<void>;
  abstract addMovement(input: { sessionId: string; type: CashMovementType; amount: number; reason: string; userId: string | null }): Promise<void>;
  abstract addReturn(input: NewReturn & { userId: string | null }): Promise<void>;
  /** Quantités et IMEI déjà rapportés, par ligne de la commande. */
  abstract returnedSoFar(orderId: string): Promise<ReturnedSoFar>;
  /**
   * Consomme l'avoir d'un retour (échange), atomiquement : faux si le retour n'existe pas
   * ou si son avoir restant ne couvre pas le montant.
   */
  abstract consumeCredit(returnId: string, amount: number): Promise<boolean>;
  /** Espèces attendues dans le tiroir d'une session (fond + encaissé − rendu + entrées − sorties). */
  abstract expectedCash(sessionId: string): Promise<number>;
}

export abstract class PosSettingsStore {
  abstract get(): Promise<PosSettings>;
  abstract save(settings: PosSettings): Promise<PosSettings>;
}

export abstract class PosReadModel {
  abstract getSession(id: string): Promise<PosSessionDto | null>;
  abstract getSessionDetail(id: string): Promise<PosSessionDetailDto | null>;
  /** Sessions de la boutique ; `openedBy` restreint à celles d'un vendeur. */
  abstract listSessions(query: PosSessionListQuery, openedBy: string | null): Promise<Paginated<PosSessionDto>>;
  abstract listSales(query: PosSaleListQuery): Promise<Paginated<PosSaleSummaryDto>>;
  abstract getReturn(id: string): Promise<OrderReturnDto | null>;
  /** Avoirs encore disponibles nés de retours de cette session. */
  abstract openCredits(sessionId: string): Promise<PosCreditDto[]>;
  abstract userName(userId: string): Promise<string | null>;
}
