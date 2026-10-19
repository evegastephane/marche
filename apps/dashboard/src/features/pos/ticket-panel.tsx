import type { Currency, PosQuoteDto } from '@marche/contracts';
import { Minus, Package, Percent, PlusCircle, Plus, ShoppingBasket, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount, formatMoney } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { EASE_OUT, glide } from '@/shared/ui/motion';
import type { TicketApi } from './ticket';

/**
 * Le ticket en cours : articles (IMEI des appareils), client, remise, puis le total exact dans
 * l'afficheur et la seule touche orange de l'écran, « Encaisser ».
 */
export function TicketPanel({
  currency,
  ticket,
  quote,
  quoteError,
  pricing,
  onCustomer,
  onDiscount,
  onCustomLine,
  onCheckout,
  onClear,
  className,
}: {
  currency: Currency;
  ticket: TicketApi;
  quote: PosQuoteDto | undefined;
  quoteError: string | null;
  /** Encaissement demandé pendant le calcul du total : la touche attend. */
  pricing: boolean;
  onCustomer: () => void;
  onDiscount: () => void;
  onCustomLine: () => void;
  onCheckout: () => void;
  onClear: () => void;
  className?: string;
}) {
  const { ticket: current, dispatch, itemsCount, subtotal } = ticket;
  const empty = itemsCount === 0;
  const total = quote?.totalAmount ?? subtotal;
  const discountAmount = quote?.discountAmount ?? 0;

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader
        title="Ticket"
        count={itemsCount}
        actions={
          !empty && (
            <Button size="sm" variant="ghost" onClick={onClear}>
              Vider
            </Button>
          )
        }
      />
      {empty ? (
        <EmptyState icon={ShoppingBasket} title="Ticket vide" className="py-7">
          Scannez un article, ou touchez-le dans la liste.
        </EmptyState>
      ) : (
        <ul className="max-h-[42dvh] overflow-y-auto border-t border-line lg:max-h-[46dvh]">
          <AnimatePresence initial={false}>
            {current.lines.map((line) => {
              const over = line.available !== null && line.quantity > line.available;
              return (
                <motion.li
                  key={line.variantId}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.2, ease: EASE_OUT } }}
                  transition={glide}
                  className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <span className="well relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.6rem]">
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt="" className="size-full object-contain p-0.5" />
                    ) : (
                      <Package className="size-4 text-ink-3" strokeWidth={1.6} aria-hidden />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] font-[600]">{line.productTitle}</span>
                        <span className="block truncate text-[0.8125rem] text-ink-2">
                          {line.variantTitle !== 'Par défaut' ? line.variantTitle : line.sku}
                          {over && <span className="text-danger-ink"> · {line.available} en stock</span>}
                        </span>
                      </span>
                      <span className="tabular shrink-0 font-[600]">{formatMoney(line.priceAmount * line.quantity, currency)}</span>
                    </span>
                    {line.tracksUnits ? (
                      <span className="flex flex-wrap gap-1.5">
                        {line.serials.map((serial) => (
                          <span key={serial} className="well inline-flex h-7 items-center gap-1 rounded-lg pr-1 pl-2.5 text-[0.75rem] font-[560]">
                            <span className="tabular">IMEI {serial}</span>
                            <button
                              type="button"
                              aria-label={`Retirer l’appareil ${serial}`}
                              onClick={() => dispatch({ type: 'removeSerial', variantId: line.variantId, serial })}
                              className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface hover:text-ink"
                            >
                              <X className="size-3.5" strokeWidth={2} />
                            </button>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="flex items-center justify-between gap-2">
                        <span className="well flex items-center rounded-[0.7rem] p-0.5">
                          <button
                            type="button"
                            aria-label="Retirer un"
                            onClick={() => dispatch({ type: 'quantity', variantId: line.variantId, quantity: line.quantity - 1 })}
                            disabled={line.quantity <= 1}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink disabled:opacity-40"
                          >
                            <Minus className="size-4" />
                          </button>
                          <input
                            aria-label={`Quantité ${line.productTitle}`}
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(e) =>
                              dispatch({ type: 'quantity', variantId: line.variantId, quantity: Number(e.target.value.replace(/\D/g, '')) || 1 })
                            }
                            className="tabular w-10 bg-transparent text-center font-[600] outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Ajouter un"
                            onClick={() => dispatch({ type: 'quantity', variantId: line.variantId, quantity: line.quantity + 1 })}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink"
                          >
                            <Plus className="size-4" />
                          </button>
                        </span>
                        <span className="tabular text-[0.8125rem] text-ink-3">{formatMoney(line.priceAmount, currency)} l’unité</span>
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`Retirer ${line.productTitle}`}
                    onClick={() => dispatch({ type: 'remove', variantId: line.variantId })}
                    className="-mr-1 inline-flex size-9 shrink-0 items-center justify-center self-start rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="size-4" strokeWidth={1.8} />
                  </button>
                </motion.li>
              );
            })}
            {current.customLines.map((line) => (
              <motion.li
                key={line.id}
                layout="position"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.2, ease: EASE_OUT } }}
                transition={glide}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span className="well inline-flex size-10 shrink-0 items-center justify-center rounded-[0.6rem] text-ink-3">
                  <PlusCircle className="size-4" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-[600]">{line.title}</span>
                  <span className="tabular block text-[0.8125rem] text-ink-2">
                    Divers · {line.quantity} × {formatMoney(line.unitPriceAmount, currency)}
                  </span>
                </span>
                <span className="tabular font-[600]">{formatMoney(line.unitPriceAmount * line.quantity, currency)}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${line.title}`}
                  onClick={() => dispatch({ type: 'removeCustom', id: line.id })}
                  className="-mr-1 inline-flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-4" strokeWidth={1.8} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="flex flex-col gap-4 border-t border-line p-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<UserRound strokeWidth={1.8} />} onClick={onCustomer} className="max-w-full">
            <span className="truncate">{current.customer ? current.customer.label : 'Client'}</span>
          </Button>
          <Button size="sm" variant="secondary" icon={<Percent strokeWidth={1.8} />} onClick={onDiscount} disabled={empty}>
            {current.discount
              ? current.discount.kind === 'PERCENT'
                ? `Remise ${current.discount.value} %`
                : `Remise ${formatMoney(current.discount.value, currency)}`
              : 'Remise'}
          </Button>
          <Button size="sm" variant="ghost" icon={<PlusCircle strokeWidth={1.8} />} onClick={onCustomLine}>
            Divers
          </Button>
        </div>

        <div className="display-window flex flex-col gap-2 rounded-xl px-4 py-3.5">
          {discountAmount > 0 && (
            <>
              <span className="tabular flex justify-between text-[0.875rem] text-display-dim">
                <span>Sous-total</span>
                <span>{formatMoney(quote?.subtotalAmount ?? subtotal, currency)}</span>
              </span>
              <span className="tabular flex justify-between text-[0.875rem] text-display-dim">
                <span>Remises</span>
                <span>−{formatMoney(discountAmount, currency)}</span>
              </span>
            </>
          )}
          <span className="flex items-end justify-between gap-4">
            <span className="legend pb-1 text-display-dim">À payer</span>
            <span className="flex items-baseline gap-2">
              <AnimatedNumber value={total} format={(n) => formatAmount(Math.round(n), currency)} className="readout text-[2.25rem]" />
              <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
            </span>
          </span>
        </div>
        {quoteError && (
          <p role="alert" className="text-[0.8125rem] font-[560] text-danger-ink">
            {quoteError}
          </p>
        )}
        <Button variant="primary" size="lg" className="w-full" loading={pricing} disabled={empty || quoteError !== null} onClick={onCheckout}>
          Encaisser
          <kbd className="ml-1 hidden rounded-md bg-on-accent/10 px-1.5 text-[0.75rem] font-[600] lg:inline">F2</kbd>
        </Button>
      </div>
    </Card>
  );
}
