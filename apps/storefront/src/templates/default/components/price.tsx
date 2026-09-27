import type { Currency } from '@marche/contracts';
import { cn, formatMoney } from '@/lib/format';

/** Prix dans la devise de la boutique ; le prix avant remise est barré à côté. */
export function Price({
  amount,
  maxAmount,
  compareAt,
  currency,
  className,
}: {
  amount: number;
  maxAmount?: number;
  compareAt?: number | null;
  currency: Currency;
  className?: string;
}) {
  const range = maxAmount !== undefined && maxAmount !== amount;
  return (
    <span className={cn('tabular inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className="font-semibold">
        {range ? 'À partir de ' : ''}
        {formatMoney(amount, currency)}
      </span>
      {compareAt != null && compareAt > amount && (
        <s className="text-[0.9em] text-muted">
          <span className="sr-only">Au lieu de </span>
          {formatMoney(compareAt, currency)}
        </s>
      )}
    </span>
  );
}
