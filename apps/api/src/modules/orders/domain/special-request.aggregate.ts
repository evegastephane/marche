import type { Currency, SpecialRequestStatus } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export interface SpecialRequestData {
  storeId: string;
  productId: string | null;
  productTitle: string;
  productSlug: string | null;
  /** Configuration souhaitée, même absente du stock ou du catalogue. */
  options: { name: string; value: string }[];
  quantity: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
  note: string | null;
  currency: Currency;
  status: SpecialRequestStatus;
  quotedUnitPriceAmount: number | null;
  quotedDelay: string | null;
  declineReason: string | null;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SpecialRequestSubmission = Omit<
  SpecialRequestData,
  'status' | 'quotedUnitPriceAmount' | 'quotedDelay' | 'declineReason' | 'orderId' | 'createdAt' | 'updatedAt'
>;

export class InvalidRequestTransitionError extends ConflictError {
  constructor(from: SpecialRequestStatus, action: string) {
    super('INVALID_REQUEST_TRANSITION', `Action « ${action} » impossible sur une demande ${from}`, { from, action });
  }
}

/**
 * Commande sur demande : NEW → QUOTED (prix et délai annoncés, modifiables) → CONVERTED (brouillon
 * de commande créé). NEW ou QUOTED → DECLINED. Une demande n'est convertie qu'une fois (R13).
 */
export class SpecialRequest extends AggregateRoot {
  private constructor(
    id: string,
    private data: SpecialRequestData,
    version = 0,
  ) {
    super(id, version);
  }

  static submit(input: SpecialRequestSubmission, now: Date): SpecialRequest {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new ValidationError('VALIDATION_FAILED', 'Quantité invalide');
    }
    const request = new SpecialRequest(newId(), {
      ...input,
      options: input.options.map((option) => ({ ...option })),
      status: 'NEW',
      quotedUnitPriceAmount: null,
      quotedDelay: null,
      declineReason: null,
      orderId: null,
      createdAt: now,
      updatedAt: now,
    });
    request.record(
      createEvent(
        'orders.special-request.received',
        input.storeId,
        request.id,
        { productTitle: input.productTitle, quantity: input.quantity },
        now,
      ),
    );
    return request;
  }

  static reconstitute(id: string, data: SpecialRequestData, version: number): SpecialRequest {
    return new SpecialRequest(id, { ...data, options: data.options.map((option) => ({ ...option })) }, version);
  }

  get status(): SpecialRequestStatus {
    return this.data.status;
  }

  snapshot(): Readonly<SpecialRequestData> {
    return { ...this.data, options: this.data.options.map((option) => ({ ...option })) };
  }

  /** Configuration lisible : « 256 Go / Bleu / Reconditionné ». */
  get configurationLabel(): string {
    return this.data.options.map((option) => option.value).join(' / ');
  }

  /** Prix et délai annoncés au client ; un devis peut être corrigé tant qu'il n'est pas converti. */
  quote(input: { unitPriceAmount: number; delay: string }, now: Date): void {
    if (this.data.status !== 'NEW' && this.data.status !== 'QUOTED') {
      throw new InvalidRequestTransitionError(this.data.status, 'chiffrer');
    }
    if (!Number.isSafeInteger(input.unitPriceAmount) || input.unitPriceAmount < 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Prix invalide');
    }
    this.data = {
      ...this.data,
      status: 'QUOTED',
      quotedUnitPriceAmount: input.unitPriceAmount,
      quotedDelay: input.delay.trim(),
      updatedAt: now,
    };
    this.record(
      createEvent(
        'orders.special-request.quoted',
        this.data.storeId,
        this.id,
        { unitPriceAmount: input.unitPriceAmount, delay: this.data.quotedDelay },
        now,
      ),
    );
  }

  decline(reason: string, now: Date): void {
    if (this.data.status !== 'NEW' && this.data.status !== 'QUOTED') {
      throw new InvalidRequestTransitionError(this.data.status, 'refuser');
    }
    this.data = { ...this.data, status: 'DECLINED', declineReason: reason.trim(), updatedAt: now };
    this.record(createEvent('orders.special-request.declined', this.data.storeId, this.id, { reason }, now));
  }

  /** Le devis accepté devient un brouillon de commande (ligne libre au prix convenu). */
  convert(orderId: string, now: Date): void {
    if (this.data.status !== 'QUOTED' || this.data.quotedUnitPriceAmount === null) {
      throw new InvalidRequestTransitionError(this.data.status, 'convertir en commande');
    }
    this.data = { ...this.data, status: 'CONVERTED', orderId, updatedAt: now };
    this.record(createEvent('orders.special-request.converted', this.data.storeId, this.id, { orderId }, now));
  }
}
