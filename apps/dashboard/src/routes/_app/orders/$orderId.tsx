import type { OrderDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Banknote, Ban, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { type OrderAction, useOrder, useOrderAction } from '@/features/orders/api';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/features/orders/status';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatMoney, orderNumber } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Textarea } from '@/shared/ui/field';
import { AnimatedNumber } from '@/shared/ui/animated-number';
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
          className="group inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Commandes
        </Link>
      </motion.div>
      {order.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-64" />
        </div>
      ) : order.error ? (
        order.error instanceof ApiError && order.error.code === 'NOT_FOUND' ? (
          <div className="card">
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
  const [cancelOpen, setCancelOpen] = useState(false);
  const status = ORDER_STATUS[order.status];
  const payment = PAYMENT_STATUS[order.paymentStatus];
  const canPay = order.paymentStatus === 'UNPAID' && (order.status === 'PLACED' || order.status === 'FULFILLED');
  const canShip = order.status === 'PLACED';
  const canCancel = order.status === 'PLACED' || order.status === 'DRAFT';
  const pending = action.isPending ? action.variables?.action.type : undefined;

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: EASE_OUT }}
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
      >
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Commande</span>
          <h1 className="display tabular text-[2.75rem] md:text-[3.5rem]">{orderNumber(order.number)}</h1>
          <div className="flex flex-wrap items-center gap-2 text-[0.875rem] text-ink-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && (
              <Badge tone={payment.tone}>{payment.label}</Badge>
            )}
            <span className="ml-1">
              {order.placedAt
                ? `Passée le ${formatDateTime(order.placedAt)}`
                : `Créée le ${formatDateTime(order.createdAt)}`}
              {' · '}
              {order.source === 'STOREFRONT' ? 'depuis le site' : 'saisie dans Upsell'}
            </span>
          </div>
        </div>
        {(canPay || canShip || canCancel) && (
          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button variant="ghost" icon={<Ban />} onClick={() => setCancelOpen(true)} disabled={action.isPending}>
                Annuler
              </Button>
            )}
            {canPay && (
              <Button
                variant="secondary"
                icon={<Banknote />}
                loading={pending === 'mark-paid'}
                disabled={action.isPending}
                onClick={() => run({ type: 'mark-paid' }, 'Commande marquée payée')}
              >
                Marquer payée
              </Button>
            )}
            {canShip && (
              <Button
                icon={<Truck />}
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
          <span className="font-bold">
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
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
        }}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8"
      >
        <Card className="overflow-hidden">
          <CardHeader title="Articles" count={order.lines.reduce((sum, l) => sum + l.quantity, 0)} />
          <ul className="divide-y divide-line border-t border-line">
            {order.lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate font-[640]">{line.productTitle}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-2">
                    {line.variantTitle !== 'Par défaut' ? `${line.variantTitle} · ` : ''}
                    {line.sku}
                  </span>
                </span>
                <span className="tabular text-right">
                  <span className="block font-[680]">{formatMoney(line.lineTotalAmount, order.currency)}</span>
                  <span className="block text-[0.8125rem] text-ink-2">
                    {line.quantity} × {formatMoney(line.unitPriceAmount, order.currency)}
                  </span>
                </span>
              </li>
            ))}
            {order.lines.length === 0 && <li className="px-5 py-6 text-ink-2">Aucun article pour l’instant.</li>}
          </ul>
          <dl className="tabular flex flex-col gap-1.5 border-t border-line bg-surface-2/60 px-5 py-4">
            <div className="flex justify-between text-ink-2">
              <dt>Sous-total</dt>
              <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
            </div>
            <div className="flex justify-between text-ink-2">
              <dt>
                Livraison
                {order.shippingMethod ? ` (${order.shippingMethod})` : ''}
              </dt>
              <dd>{order.shippingAmount === 0 ? 'Offerte' : formatMoney(order.shippingAmount, order.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <dt className="heading text-[1.0625rem]">Total</dt>
              <dd className="display text-[1.75rem]">
                <AnimatedNumber value={order.totalAmount} format={(n) => formatMoney(Math.round(n), order.currency)} />
              </dd>
            </div>
          </dl>
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
        <p className="text-[1.0625rem] font-[680]">{name || order.email || 'Client non renseigné'}</p>
        <ul className="flex flex-col gap-2 text-[0.9375rem] text-ink-2">
          {(customer?.email ?? order.email) && (
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-brand-ink" aria-hidden />
              <a href={`mailto:${customer?.email ?? order.email}`} className="truncate text-ink">
                {customer?.email ?? order.email}
              </a>
            </li>
          )}
          {(customer?.phone ?? address?.phone) && (
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-brand-ink" aria-hidden />
              <a href={`tel:${customer?.phone ?? address?.phone}`} className="text-ink">
                {customer?.phone ?? address?.phone}
              </a>
            </li>
          )}
          {address && (
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
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
          <p className="rounded-xl bg-sun-soft px-3.5 py-2.5 text-[0.9375rem] text-ink">
            <span className="font-bold">Note : </span>
            {order.note}
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Suivi : le fil se remplit jusqu'à la dernière étape franchie, chaque pastille
 * franchie éclot à son tour ; les étapes à venir restent creuses.
 */
function Suivi({ order }: { order: OrderDto }) {
  const steps = [
    { label: 'Créée', at: order.createdAt, tone: 'bg-ink-3' },
    { label: 'Passée', at: order.placedAt, tone: 'bg-sun' },
    { label: 'Payée', at: order.paidAt, tone: 'bg-brand' },
    order.cancelledAt
      ? { label: 'Annulée', at: order.cancelledAt, tone: 'bg-danger' }
      : { label: 'Expédiée', at: order.fulfilledAt, tone: 'bg-success' },
  ];
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Suivi" />
      <ol className="flex flex-col px-5 pb-5">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute top-5 bottom-0 left-[0.4375rem] w-0.5 overflow-hidden rounded-full bg-line"
              >
                {steps[index + 1]?.at && (
                  <motion.span
                    className="block h-full w-full origin-top bg-ink-3"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      duration: 0.35,
                      ease: EASE_OUT,
                      delay: 0.25 + index * 0.18,
                    }}
                  />
                )}
              </span>
            )}
            <motion.span
              aria-hidden
              className={cn(
                'relative mt-1 size-4 shrink-0 rounded-full ring-4 ring-surface',
                step.at ? step.tone : 'bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]',
              )}
              initial={step.at ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 520,
                damping: 16,
                delay: 0.15 + index * 0.18,
              }}
            />
            <span className="flex flex-col">
              <span className={cn('font-[650]', !step.at && 'text-ink-3')}>{step.label}</span>
              <span className="tabular text-[0.8125rem] text-ink-2">
                {step.at ? formatDateTime(step.at) : 'à venir'}
              </span>
            </span>
          </li>
        ))}
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
