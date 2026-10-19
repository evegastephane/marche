import { ConflictError, ForbiddenError, ValidationError } from '../../../shared/domain/domain-error.js';

export class PaymentInsufficientError extends ValidationError {
  constructor(missingAmount: number) {
    super('PAYMENT_INSUFFICIENT', 'Le paiement ne couvre pas le total du ticket', { missingAmount });
  }
}

export class PaymentExceedsTotalError extends ValidationError {
  constructor() {
    super(
      'PAYMENT_EXCEEDS_TOTAL',
      'Seules les espèces rendent la monnaie : un paiement Mobile Money, carte ou virement ne dépasse pas le total',
    );
  }
}

export class PaymentMethodDisabledError extends ValidationError {
  constructor(label: string) {
    super('PAYMENT_METHOD_DISABLED', `${label} n’est pas accepté dans les réglages de la caisse`);
  }
}

export class DiscountNotAllowedError extends ForbiddenError {
  constructor(maxPercent: number) {
    super(
      'DISCOUNT_NOT_ALLOWED',
      maxPercent === 0
        ? 'Un vendeur ne peut pas accorder de remise : demandez à un administrateur'
        : `Un vendeur peut accorder ${maxPercent} % de remise au plus : demandez à un administrateur`,
      { maxPercent },
    );
  }
}

export class CreditUnavailableError extends ConflictError {
  constructor() {
    super('CREDIT_UNAVAILABLE', 'Cet avoir est déjà utilisé, ou son montant ne suffit pas');
  }
}
