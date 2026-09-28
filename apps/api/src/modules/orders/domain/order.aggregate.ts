import { randomBytes } from 'node:crypto';
import type {
  Address,
  Currency,
  OrderDiscount,
  OrderSource,
  OrderStatus,
  PaymentStatus,
} from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { InvalidOrderTransitionError, OrderState } from './order-state.js';
import type { ShippingStrategy } from './shipping-strategy.js';

/** Ligne figée (R6) : titre, SKU et prix au moment de l'ajout, rafraîchis au passage de la commande. */
export interface OrderLineData {
  id: string;
  variantId: string | null;
  productTitle: string;
  variantTitle: string;
  sku: string;
  unitPriceAmount: number;
  quantity: number;
  tracksInventory: boolean;
  /** Ligne libre (commande sur demande) : hors catalogue, au prix convenu, sans stock réservé. */
  custom: boolean;
}

export type NewOrderLine = Omit<OrderLineData, 'id'>;

export interface OrderData {
  storeId: string;
  number: number | null;
  publicToken: string;
  customerId: string | null;
  email: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: OrderSource;
  currency: Currency;
  lines: OrderLineData[];
  subtotalAmount: number;
  /** Remises des packs (R11 : recalculées par le serveur, jamais reprises du client). */
  discounts: OrderDiscount[];
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddress: Address | null;
  shippingMethod: string | null;
  note: string | null;
  cancelReason: string | null;
  placedAt: Date | null;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Lien de suivi public de l'acheteur : 32 octets aléatoires, impossible à deviner. */
export function newPublicToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Lignes figées et remises des packs, prêtes à poser sur une commande. */
export interface PricedLines {
  lines: readonly NewOrderLine[];
  discounts: readonly OrderDiscount[];
}

function buildDiscounts(discounts: readonly OrderDiscount[]): OrderDiscount[] {
  return discounts.map((discount) => {
    if (!Number.isSafeInteger(discount.amount) || discount.amount < 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Remise invalide');
    }
    return { ...discount };
  });
}

export function lineTotal(line: Pick<OrderLineData, 'unitPriceAmount' | 'quantity'>): number {
  return line.unitPriceAmount * line.quantity;
}

export class Order extends AggregateRoot {
  private state: OrderState;

  private constructor(
    id: string,
    private data: OrderData,
    version = 0,
  ) {
    super(id, version);
    this.state = OrderState.of(data.status);
  }

  static createDraft(
    input: {
      storeId: string;
      currency: Currency;
      source: OrderSource;
      email?: string | null;
      shippingAddress?: Address | null;
      note?: string | null;
    },
    now: Date,
  ): Order {
    return new Order(newId(), {
      storeId: input.storeId,
      number: null,
      publicToken: newPublicToken(),
      customerId: null,
      email: input.email ?? null,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      source: input.source,
      currency: input.currency,
      lines: [],
      subtotalAmount: 0,
      discounts: [],
      discountAmount: 0,
      shippingAmount: 0,
      totalAmount: 0,
      shippingAddress: input.shippingAddress ?? null,
      shippingMethod: null,
      note: input.note ?? null,
      cancelReason: null,
      placedAt: null,
      paidAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(id: string, data: OrderData, version: number): Order {
    return new Order(
      id,
      { ...data, lines: data.lines.map((line) => ({ ...line })), discounts: data.discounts.map((d) => ({ ...d })) },
      version,
    );
  }

  get status(): OrderStatus {
    return this.state.status;
  }

  get storeId(): string {
    return this.data.storeId;
  }

  get email(): string | null {
    return this.data.email;
  }

  get lines(): readonly OrderLineData[] {
    return this.data.lines;
  }

  snapshot(): Readonly<OrderData> {
    return {
      ...this.data,
      lines: this.data.lines.map((line) => ({ ...line })),
      discounts: this.data.discounts.map((d) => ({ ...d })),
    };
  }

  /** Lignes ayant réservé du stock (celles dont la variante suit l'inventaire). */
  reservedLines(): { variantId: string; quantity: number }[] {
    return this.data.lines
      .filter((line) => line.tracksInventory && line.variantId !== null)
      .map((line) => ({ variantId: line.variantId as string, quantity: line.quantity }));
  }

  /** Brouillon uniquement : remplace les lignes (et leurs remises) et recalcule les totaux. */
  replaceLines(priced: PricedLines, shipping: ShippingStrategy, now: Date): void {
    if (!this.state.canEditLines) throw new InvalidOrderTransitionError(this.status, 'modifier');
    this.data = { ...this.data, lines: this.buildLines(priced.lines), discounts: buildDiscounts(priced.discounts), updatedAt: now };
    this.recomputeTotals(shipping);
  }

  updateDetails(
    patch: { email?: string | null; customerId?: string | null; shippingAddress?: Address | null; note?: string | null },
    now: Date,
  ): void {
    if (!this.state.canEditLines) throw new InvalidOrderTransitionError(this.status, 'modifier');
    this.data = {
      ...this.data,
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.customerId !== undefined ? { customerId: patch.customerId } : {}),
      ...(patch.shippingAddress !== undefined ? { shippingAddress: patch.shippingAddress } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      updatedAt: now,
    };
  }

  /**
   * UC-31 : DRAFT → PLACED. Les lignes sont refigées (prix du moment), le numéro attribué (R8).
   * La réservation du stock (R5) est faite par le use case, dans la même transaction.
   */
  place(
    input: { number: number; priced: PricedLines; shipping: ShippingStrategy; customerId: string | null },
    now: Date,
  ): void {
    const next = this.state.place();
    if (input.priced.lines.length === 0) {
      throw new ValidationError('VALIDATION_FAILED', 'La commande ne contient aucun article');
    }
    this.data = {
      ...this.data,
      number: input.number,
      lines: this.buildLines(input.priced.lines),
      discounts: buildDiscounts(input.priced.discounts),
      customerId: input.customerId,
      status: next.status,
      shippingMethod: input.shipping.code,
      placedAt: now,
      updatedAt: now,
    };
    this.state = next;
    this.recomputeTotals(input.shipping);
    this.record(
      createEvent(
        'orders.order.placed',
        this.data.storeId,
        this.id,
        {
          number: input.number,
          source: this.data.source,
          email: this.data.email,
          totalAmount: this.data.totalAmount,
          currency: this.data.currency,
          itemsCount: this.data.lines.reduce((sum, line) => sum + line.quantity, 0),
        },
        now,
      ),
    );
  }

  /** UC-32 : paiement encaissé (manuel en MVP), commande passée ou expédiée. */
  markPaid(now: Date): void {
    if (!this.state.canMarkPaid || this.data.paymentStatus !== 'UNPAID') {
      throw new InvalidOrderTransitionError(`${this.status}/${this.data.paymentStatus}`, 'marquer payée');
    }
    this.data = { ...this.data, paymentStatus: 'PAID', paidAt: now, updatedAt: now };
    this.record(
      createEvent('orders.order.paid', this.data.storeId, this.id, { number: this.data.number }, now),
    );
  }

  /** UC-33 : PLACED → FULFILLED (le use case consomme le stock réservé). */
  fulfill(now: Date): void {
    this.state = this.state.fulfill();
    this.data = { ...this.data, status: this.state.status, fulfilledAt: now, updatedAt: now };
    this.record(
      createEvent('orders.order.fulfilled', this.data.storeId, this.id, { number: this.data.number, email: this.data.email }, now),
    );
  }

  /** UC-34 : DRAFT/PLACED → CANCELLED. Retourne l'état précédent (PLACED ⇒ libérer le stock). */
  cancel(reason: string, now: Date): OrderStatus {
    const previous = this.status;
    this.state = this.state.cancel();
    this.data = { ...this.data, status: this.state.status, cancelReason: reason, cancelledAt: now, updatedAt: now };
    this.record(
      createEvent(
        'orders.order.cancelled',
        this.data.storeId,
        this.id,
        { number: this.data.number, previousStatus: previous, reason },
        now,
      ),
    );
    return previous;
  }

  private buildLines(lines: readonly NewOrderLine[]): OrderLineData[] {
    return lines.map((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new ValidationError('VALIDATION_FAILED', 'Quantité invalide');
      }
      if (!Number.isSafeInteger(line.unitPriceAmount) || line.unitPriceAmount < 0) {
        throw new ValidationError('VALIDATION_FAILED', 'Prix unitaire invalide');
      }
      return { ...line, id: newId() };
    });
  }

  /** La remise ne dépasse jamais le sous-total ; la livraison (et son seuil de gratuité) porte sur le montant remisé. */
  private recomputeTotals(shipping: ShippingStrategy): void {
    const subtotalAmount = this.data.lines.reduce((sum, line) => sum + lineTotal(line), 0);
    const discountAmount = Math.min(
      this.data.discounts.reduce((sum, discount) => sum + discount.amount, 0),
      subtotalAmount,
    );
    const shippingAmount = shipping.compute(subtotalAmount - discountAmount);
    this.data = {
      ...this.data,
      subtotalAmount,
      discountAmount,
      shippingAmount,
      totalAmount: subtotalAmount - discountAmount + shippingAmount,
      shippingMethod: shipping.code,
    };
  }
}
