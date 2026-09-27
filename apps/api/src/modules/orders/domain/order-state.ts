import type { OrderStatus } from '@marche/contracts';
import { ConflictError } from '../../../shared/domain/domain-error.js';

export class InvalidOrderTransitionError extends ConflictError {
  constructor(from: string, action: string) {
    super('INVALID_ORDER_TRANSITION', `Action « ${action} » impossible sur une commande ${from}`, { from, action });
  }
}

/**
 * Machine à états de la commande (pattern State, docs/ARCHITECTURE.md §3.3) :
 * chaque état décide des transitions permises. Par défaut, tout est refusé.
 */
export abstract class OrderState {
  abstract readonly status: OrderStatus;

  get canEditLines(): boolean {
    return false;
  }

  get canMarkPaid(): boolean {
    return false;
  }

  place(): OrderState {
    throw new InvalidOrderTransitionError(this.status, 'passer');
  }

  fulfill(): OrderState {
    throw new InvalidOrderTransitionError(this.status, 'expédier');
  }

  cancel(): OrderState {
    throw new InvalidOrderTransitionError(this.status, 'annuler');
  }

  static of(status: OrderStatus): OrderState {
    switch (status) {
      case 'DRAFT':
        return new DraftState();
      case 'PLACED':
        return new PlacedState();
      case 'FULFILLED':
        return new FulfilledState();
      case 'CANCELLED':
        return new CancelledState();
    }
  }
}

export class DraftState extends OrderState {
  readonly status = 'DRAFT' as const;

  override get canEditLines(): boolean {
    return true;
  }

  override place(): OrderState {
    return new PlacedState();
  }

  override cancel(): OrderState {
    return new CancelledState();
  }
}

export class PlacedState extends OrderState {
  readonly status = 'PLACED' as const;

  override get canMarkPaid(): boolean {
    return true;
  }

  override fulfill(): OrderState {
    return new FulfilledState();
  }

  override cancel(): OrderState {
    return new CancelledState();
  }
}

export class FulfilledState extends OrderState {
  readonly status = 'FULFILLED' as const;

  override get canMarkPaid(): boolean {
    return true;
  }
}

export class CancelledState extends OrderState {
  readonly status = 'CANCELLED' as const;
}
