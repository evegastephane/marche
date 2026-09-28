import type { OrderDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Ban, Banknote, Mail, MapPin, Phone, Send, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { type OrderAction, useOrder, useOrderAction, usePlaceOrder } from '@/features/orders/api';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/features/orders/status';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount, formatDateTime, formatMoney, orderNumber } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Badge, Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Textarea } from '@/shared/ui/field';
import { EASE_OUT, riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/orders/$orderId')({
  component: CommandeDetail,
});

function CommandeDetail() {
  const { orderId } = Route.useParams();
  const order = useOrder(orderId);

  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link
          to="/orders"
          className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Commandes
        </Link>
      </motion.div>
      {order.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-64" />
        </div>
      ) : order.error ? (
        order.error instanceof ApiError && order.error.code === 'NOT_FOUND' ? (
          <div className="panel">
            <EmptyState icon={Ban} title="Commande introuvable">
              Elle a peut-être été supprimée, ou appartient à une autre boutique.
            </EmptyState>
          </div>
        ) : (
          <LoadError message={errorMessage(order.error)} onRetry={() => void order.refetch()} />
        )
      ) : (
        <Detail order={order.data} />
      )}
    </div>
  );
}

function Detail({ order }: { order: OrderDto }) {
  const action = useOrderAction();
  const place = usePlaceOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const status = ORDER_STATUS[order.status];
  const payment = PAYMENT_STATUS[order.paymentStatus];
  const canPay = order.paymentStatus === 'UNPAID' && (order.status === 'PLACED' || order.status === 'FULFILLED');
  const canShip = order.status === 'PLACED';
  const canCancel = order.status === 'PLACED' || order.status === 'DRAFT';
  const canPlace = order.status === 'DRAFT' && order.lines.length > 0;
  const pending = action.isPending ? action.variables?.action.type : undefined;
  // La touche orange : expédier tant que la commande attend, puis encaisser si elle est partie sans être payée.
  const next = canShip ? 'fulfill' : canPay ? 'mark-paid' : null;

  const run = (act: OrderAction, success: string, done?: () => void) =>
    action.mutate(
      { id: order.id, action: act },
      {
        onSuccess: () => {
          toast(success, { description: orderNumber(order.number) });
          done?.();
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: EASE_OUT }}
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
      >
        <div className="flex flex-col gap-2.5">
          <h1 className="display tabular text-[2.5rem] md:text-[3.25rem]">
            <span className="sr-only">Commande </span>
            {orderNumber(order.number)}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.875rem] text-ink-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && <Badge tone={payment.tone}>{payment.label}</Badge>}
            <span>
              {order.placedAt ? `Passée le ${formatDateTime(order.placedAt)}` : `Créée le ${formatDateTime(order.createdAt)}`}
              {' · '}
              {order.source === 'STOREFRONT' ? 'depuis le site' : 'saisie dans Upsell'}
            </span>
          </div>
        </div>
        {(canPay || canShip || canCancel || canPlace) && (
          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button
                variant="ghost"
                icon={<Ban strokeWidth={1.8} />}
                onClick={() => setCancelOpen(true)}
                disabled={action.isPending}
              >
                Annuler
              </Button>
            )}
            {canPay && (
              <Button
                variant={next === 'mark-paid' ? 'primary' : 'secondary'}
                icon={<Banknote strokeWidth={1.8} />}
                loading={pending === 'mark-paid'}
                disabled={action.isPending}
                onClick={() => run({ type: 'mark-paid' }, 'Commande marquée payée')}
              >
                Marquer payée
              </Button>
            )}
            {canPlace && (
              <Button
                variant="primary"
                icon={<Send strokeWidth={1.8} />}
                loading={place.isPending}
                disabled={action.isPending}
                onClick={() =>
                  place.mutate(order.id, {
                    onSuccess: (placed) =>
                      toast('Commande passée, stock réservé', { description: orderNumber(placed.number) }),
                    onError: (error) =>
                      toast.error(
                        error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK'
                          ? 'Stock insuffisant pour au moins un article.'
                          : errorMessage(error),
                      ),
                  })
                }
              >
                Passer la commande
              </Button>
            )}
            {canShip && (
              <Button
                variant="primary"
                icon={<Truck strokeWidth={1.8} />}
                loading={pending === 'fulfill'}
                disabled={action.isPending}
                onClick={() => run({ type: 'fulfill' }, 'Commande expédiée, stock mis à jour')}
              >
                Expédier
              </Button>
            )}
          </div>
        )}
      </motion.header>

      {order.status === 'CANCELLED' && order.cancelReason && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden rounded-xl bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger-ink"
        >
          <span className="font-[650]">
            Annulée
            {order.cancelledAt ? ` le ${formatDateTime(order.cancelledAt)}` : ''} :
          </span>{' '}
          {order.cancelReason}
        </motion.p>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
        }}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8"
      >
        <Card className="overflow-hidden">
          <CardHeader title="Articles" count={order.lines.reduce((sum, l) => sum + l.quantity, 0)} />
          <ul className="divide-y divide-line border-t border-line">
            {order.lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate font-[600]">{line.productTitle}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-2">
                    {line.variantTitle !== 'Par défaut' ? `${line.variantTitle} · ` : ''}
                    {line.sku}
                  </span>
                </span>
                <span className="tabular text-right">
                  <span className="block font-[600]">{formatMoney(line.lineTotalAmount, order.currency)}</span>
                  <span className="block text-[0.8125rem] text-ink-2">
                    {line.quantity} × {formatMoney(line.unitPriceAmount, order.currency)}
                  </span>
                </span>
              </li>
            ))}
            {order.lines.length === 0 && <li className="px-5 py-6 text-ink-2">Aucun article pour l’instant.</li>}
          </ul>
          <dl className="tabular flex flex-col gap-1.5 border-t border-line px-5 py-4 text-ink-2">
            <div className="flex justify-between">
              <dt>Sous-total</dt>
              <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>
                Livraison
                {order.shippingMethod ? ` (${order.shippingMethod})` : ''}
              </dt>
              <dd>{order.shippingAmount === 0 ? 'Offerte' : formatMoney(order.shippingAmount, order.currency)}</dd>
            </div>
          </dl>
          <div className="display-window mx-3 mb-3 flex items-end justify-between gap-4 rounded-xl px-4 py-3.5">
            <span className="legend pb-1 text-display-dim">Total</span>
            <span className="flex items-baseline gap-2">
              <AnimatedNumber
                value={order.totalAmount}
                format={(n) => formatAmount(Math.round(n), order.currency)}
                className="readout text-[2rem]"
              />
              <span className="text-[0.875rem] text-display-dim">{currencyLabel(order.currency)}</span>
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-6 lg:gap-8">
          <Client order={order} />
          <Suivi order={order} />
        </div>
      </motion.div>

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        loading={pending === 'cancel'}
        wasPlaced={order.status === 'PLACED'}
        onConfirm={(reason) => run({ type: 'cancel', reason }, 'Commande annulée', () => setCancelOpen(false))}
      />
    </>
  );
}

function Client({ order }: { order: OrderDto }) {
  const customer = order.customer;
  const address = order.shippingAddress;
  const name = customer ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') : '';
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Client" />
      <div className="flex flex-col gap-3 px-5 pb-5">
        <p className="text-[1.0625rem] font-[600]">{name || order.email || 'Client non renseigné'}</p>
        <ul className="flex flex-col gap-2 text-[0.9375rem] text-ink-2">
          {(customer?.email ?? order.email) && (
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
              <a href={`mailto:${customer?.email ?? order.email}`} className="truncate text-ink">
                {customer?.email ?? order.email}
              </a>
            </li>
          )}
          {(customer?.phone ?? address?.phone) && (
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
              <a href={`tel:${customer?.phone ?? address?.phone}`} className="text-ink">
                {customer?.phone ?? address?.phone}
              </a>
            </li>
          )}
          {address && (
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
              <address className="not-italic text-ink">
                {address.firstName} {address.lastName}
                <br />
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {[address.postalCode, address.city].filter(Boolean).join(' ')}
                {address.region ? `, ${address.region}` : ''} · {address.country}
              </address>
            </li>
          )}
        </ul>
        {order.note && (
          <p className="well rounded-xl px-3.5 py-2.5 text-[0.9375rem] text-ink">
            <span className="font-[650]">Note : </span>
            {order.note}
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Suivi en témoins : chaque étape franchie s'allume à son tour et la ligne se remplit
 * jusqu'à elle ; l'étape attendue garde un témoin orange, les suivantes restent creuses.
 */
function Suivi({ order }: { order: OrderDto }) {
  const steps = [
    { label: 'Créée', at: order.createdAt },
    { label: 'Passée', at: order.placedAt },
    { label: 'Payée', at: order.paidAt },
    order.cancelledAt
      ? { label: 'Annulée', at: order.cancelledAt, cancelled: true }
      : { label: 'Expédiée', at: order.fulfilledAt },
  ];
  const waiting = order.status === 'CANCELLED' ? -1 : steps.findIndex((step) => !step.at);
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Suivi" />
      <ol className="flex flex-col px-5 pb-5">
        {steps.map((step, index) => {
          const tone = step.at
            ? 'cancelled' in step
              ? 'danger'
              : 'on'
            : index === waiting && order.status === 'PLACED'
              ? 'attention'
              : 'off';
          return (
            <li key={step.label} className="relative flex gap-3.5 pb-4 last:pb-0">
              {index < steps.length - 1 && (
                <span aria-hidden className="absolute top-4 bottom-0 left-[0.1875rem] w-px bg-line-strong">
                  {steps[index + 1]?.at && (
                    <motion.span
                      className="block h-full w-full origin-top bg-ink"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.2 + index * 0.14 }}
                    />
                  )}
                </span>
              )}
              <motion.span
                className="relative mt-1.5 inline-flex"
                initial={step.at ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 700, damping: 30, delay: 0.12 + index * 0.14 }}
              >
                <Led tone={tone} pulse={tone === 'attention'} />
              </motion.span>
              <span className="flex flex-col">
                <span className={cn('font-[600]', !step.at && 'font-[500] text-ink-3')}>{step.label}</span>
                <span className="tabular text-[0.8125rem] text-ink-2">
                  {step.at ? formatDateTime(step.at) : index === waiting ? 'en attente' : 'à venir'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  wasPlaced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
  wasPlaced: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(undefined);
      }}
      title="Annuler la commande"
      description={
        wasPlaced
          ? 'Les articles réservés retournent dans votre stock. Le client n’est pas prévenu automatiquement.'
          : 'Le brouillon sera annulé.'
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason.trim()) {
            setError('Indiquez le motif : il reste visible dans le suivi.');
            return;
          }
          onConfirm(reason.trim());
        }}
      >
        <Field label="Motif" error={error}>
          {(props) => (
            <Textarea
              {...props}
              value={reason}
              maxLength={300}
              placeholder="Client injoignable, article abîmé…"
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Garder la commande
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            Annuler la commande
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
