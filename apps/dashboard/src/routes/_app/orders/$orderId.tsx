import type { OrderDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Banknote, Ban, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { type OrderAction, useOrder, useOrderAction } from '@/features/orders/api';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/features/orders/status';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatMoney, orderNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, PlancheHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Textarea } from '@/shared/ui/field';
import { Plaque } from '@/shared/ui/plaque';

export const Route = createFileRoute('/_app/orders/$orderId')({ component: CommandeDetail });

function CommandeDetail() {
  const { orderId } = Route.useParams();
  const order = useOrder(orderId);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/orders" className="inline-flex items-center gap-1.5 self-start text-[0.875rem] font-semibold text-encre-2 hover:text-encre">
        <ArrowLeft className="size-4" /> Commandes
      </Link>
      {order.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-64" />
        </div>
      ) : order.error ? (
        order.error instanceof ApiError && order.error.code === 'NOT_FOUND' ? (
          <div className="planche">
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
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-3">
          <h1 className="lettrage chiffres text-[3.5rem] text-baobab md:text-[4.5rem]">{orderNumber(order.number)}</h1>
          <div className="flex flex-wrap items-center gap-2 text-[0.875rem] text-encre-2">
            <Plaque tone={status.tone}>{status.label}</Plaque>
            {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && <Plaque tone={payment.tone}>{payment.label}</Plaque>}
            <span className="ml-1">
              {order.placedAt ? `Passée le ${formatDateTime(order.placedAt)}` : `Créée le ${formatDateTime(order.createdAt)}`}
              {' · '}
              {order.source === 'STOREFRONT' ? 'depuis le site' : 'saisie dans Baobab'}
            </span>
          </div>
        </div>
        {(canPay || canShip || canCancel) && (
          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button variant="fantome" icon={<Ban />} onClick={() => setCancelOpen(true)} disabled={action.isPending}>
                Annuler
              </Button>
            )}
            {canPay && (
              <Button
                variant="secondaire"
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
      </header>

      {order.status === 'CANCELLED' && order.cancelReason && (
        <p className="rounded-lg bg-rouge-50 px-4 py-3 text-[0.9375rem] text-[#7d1f16]">
          <span className="font-bold">Annulée{order.cancelledAt ? ` le ${formatDateTime(order.cancelledAt)}` : ''} :</span>{' '}
          {order.cancelReason}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <section className="planche overflow-hidden">
          <PlancheHeader title="Articles" count={order.lines.reduce((sum, l) => sum + l.quantity, 0)} />
          <ul className="divide-y divide-filet border-t border-filet">
            {order.lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate font-[640]">{line.productTitle}</span>
                  <span className="block truncate text-[0.8125rem] text-encre-2">
                    {line.variantTitle !== 'Par défaut' ? `${line.variantTitle} · ` : ''}
                    {line.sku}
                  </span>
                </span>
                <span className="chiffres text-right">
                  <span className="block font-[680]">{formatMoney(line.lineTotalAmount, order.currency)}</span>
                  <span className="block text-[0.8125rem] text-encre-2">
                    {line.quantity} × {formatMoney(line.unitPriceAmount, order.currency)}
                  </span>
                </span>
              </li>
            ))}
            {order.lines.length === 0 && <li className="px-5 py-6 text-encre-2">Aucun article pour l’instant.</li>}
          </ul>
          <dl className="chiffres flex flex-col gap-1.5 border-t-[1.5px] border-baobab px-5 py-4">
            <div className="flex justify-between text-encre-2">
              <dt>Sous-total</dt>
              <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
            </div>
            <div className="flex justify-between text-encre-2">
              <dt>Livraison{order.shippingMethod ? ` (${order.shippingMethod})` : ''}</dt>
              <dd>{order.shippingAmount === 0 ? 'Offerte' : formatMoney(order.shippingAmount, order.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <dt className="titre text-[1.25rem]">Total</dt>
              <dd className="lettrage text-[2.25rem] text-baobab">{formatMoney(order.totalAmount, order.currency)}</dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-col gap-6 lg:gap-8">
          <Client order={order} />
          <Suivi order={order} />
        </div>
      </div>

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
    <section className="planche overflow-hidden">
      <PlancheHeader title="Client" />
      <div className="flex flex-col gap-3 px-5 pb-5">
        <p className="text-[1.0625rem] font-[680]">{name || order.email || 'Client non renseigné'}</p>
        <ul className="flex flex-col gap-2 text-[0.9375rem] text-encre-2">
          {(customer?.email ?? order.email) && (
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-baobab" aria-hidden />
              <a href={`mailto:${customer?.email ?? order.email}`} className="truncate text-encre">
                {customer?.email ?? order.email}
              </a>
            </li>
          )}
          {(customer?.phone ?? address?.phone) && (
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-baobab" aria-hidden />
              <a href={`tel:${customer?.phone ?? address?.phone}`} className="text-encre">
                {customer?.phone ?? address?.phone}
              </a>
            </li>
          )}
          {address && (
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-baobab" aria-hidden />
              <address className="not-italic text-encre">
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
          <p className="rounded-lg bg-jaune-50 px-3.5 py-2.5 text-[0.9375rem] text-encre">
            <span className="font-bold">Note : </span>
            {order.note}
          </p>
        )}
      </div>
    </section>
  );
}

/** Suivi : chaque étape franchie est une pastille peinte, les étapes à venir restent creuses. */
function Suivi({ order }: { order: OrderDto }) {
  const steps = [
    { label: 'Créée', at: order.createdAt, tone: 'bg-encre-2' },
    { label: 'Passée', at: order.placedAt, tone: 'bg-jaune' },
    { label: 'Payée', at: order.paidAt, tone: 'bg-bleu' },
    order.cancelledAt
      ? { label: 'Annulée', at: order.cancelledAt, tone: 'bg-rouge' }
      : { label: 'Expédiée', at: order.fulfilledAt, tone: 'bg-baobab' },
  ];
  return (
    <section className="planche overflow-hidden">
      <PlancheHeader title="Suivi" />
      <ol className="flex flex-col px-5 pb-5">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 && (
              <span aria-hidden className="absolute top-5 bottom-0 left-[0.4375rem] w-[1.5px] bg-filet" />
            )}
            <span
              aria-hidden
              className={cn(
                'relative mt-1 size-3.5 shrink-0 rounded-full',
                step.at ? step.tone : 'bg-planche shadow-[inset_0_0_0_1.5px_var(--color-filet-fort)]',
              )}
            />
            <span className="flex flex-col">
              <span className={cn('font-[640]', !step.at && 'text-encre-3')}>{step.label}</span>
              <span className="chiffres text-[0.8125rem] text-encre-2">{step.at ? formatDateTime(step.at) : 'à venir'}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
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
          <Button variant="fantome" onClick={() => onOpenChange(false)}>
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
