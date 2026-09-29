import type { SpecialRequestDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Ban,
  Mail,
  MessageCircle,
  Phone,
  ReceiptText,
  Send,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRequest, useRequestAction } from '@/features/requests/api';
import { REQUEST_STATUS, REQUEST_TYPE } from '@/features/requests/status';
import { ApiError, errorMessage } from '@/shared/api/client';
import {
  amountToInput,
  currencyLabel,
  formatDateTime,
  formatMoney,
  parseAmount,
} from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, InputWithSuffix, Textarea } from '@/shared/ui/field';
import { riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/requests/$requestId')({
  component: Demande,
});

function Demande() {
  const { requestId } = Route.useParams();
  const request = useRequest(requestId);
  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/requests"
        search={{ filter: 'NEW' }}
        className="inline-flex min-h-10 items-center gap-2 self-start text-[0.9375rem] text-ink-2 no-underline hover:text-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.8} /> Demandes
      </Link>
      {request.isPending ? (
        <Skeleton className="h-96" />
      ) : request.error ? (
        <LoadError
          message={errorMessage(request.error)}
          onRetry={() => void request.refetch()}
        />
      ) : (
        <Detail request={request.data} />
      )}
    </div>
  );
}

/** Numéro joignable sur WhatsApp : chiffres seulement, indicatif compris. */
const whatsapp = (phone: string) =>
  `https://wa.me/${phone.replace(/[^\d]/g, '')}`;

function Detail({ request }: { request: SpecialRequestDto }) {
  const action = useRequestAction(request.id);
  const kind = REQUEST_TYPE[request.type];
  const status = REQUEST_STATUS[request.status];
  const name = [request.firstName, request.lastName].filter(Boolean).join(' ');
  const [price, setPrice] = useState(
    request.quotedUnitPriceAmount !== null
      ? amountToInput(request.quotedUnitPriceAmount, request.currency)
      : '',
  );
  const [delay, setDelay] = useState(request.quotedDelay ?? '');
  const [errors, setErrors] = useState<{ price?: string; delay?: string }>({});
  const [declineOpen, setDeclineOpen] = useState(false);
  const open = request.status === 'NEW' || request.status === 'QUOTED';
  const pending = action.isPending ? action.variables?.action : undefined;

  const quote = () => {
    const amount = parseAmount(price, request.currency);
    const next = {
      price: amount === null ? 'Indiquez un prix.' : undefined,
      delay: delay.trim()
        ? undefined
        : 'Indiquez un délai : « 5 jours », « sous 2 semaines »…',
    };
    setErrors(next);
    if (amount === null || next.delay) return;
    action.mutate(
      {
        action: 'quote',
        input: { unitPriceAmount: amount, delay: delay.trim() },
      },
      {
        onSuccess: () =>
          toast('Offre envoyée au client', {
            description: 'Il la reçoit par e-mail et vous répond.',
          }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <>
      <motion.header
        variants={riseIn}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-[1.75rem] sm:text-[2.25rem]">
              {kind.label}
            </h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-ink-2">
            {name} · reçue {formatDateTime(request.createdAt)}
          </p>
        </div>
        {request.status === 'QUOTED' && (
          <Button
            variant="primary"
            icon={<ReceiptText strokeWidth={1.8} />}
            loading={pending === 'convert'}
            disabled={action.isPending}
            onClick={() =>
              action.mutate(
                { action: 'convert' },
                {
                  onSuccess: () =>
                    toast('Commande créée en brouillon', {
                      description: 'Passez-la quand le client confirme.',
                    }),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          >
            Transformer en commande
          </Button>
        )}
        {request.status === 'CONVERTED' && request.orderId && (
          <Link
            to="/orders/$orderId"
            params={{ orderId: request.orderId }}
            className={buttonClasses('secondary')}
          >
            <ReceiptText strokeWidth={1.8} /> Voir la commande
          </Link>
        )}
      </motion.header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="La demande" />
            <div className="flex flex-col gap-4 px-5 pb-6">
              <p className="text-[1.0625rem]">
                <span className="tabular font-[650]">{request.quantity} ×</span>{' '}
                <span className="font-[650]">{request.productTitle}</span>
                {request.options.length > 0 && (
                  <span className="text-ink-2">
                    {' '}
                    ·{' '}
                    {request.options
                      .map((o) => `${o.name} ${o.value}`)
                      .join(' · ')}
                  </span>
                )}
              </p>
              {request.details.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="legend text-ink-2">{kind.detailsTitle}</span>
                  <dl className="well grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 rounded-xl px-4 py-3">
                    {request.details.map((detail) => (
                      <div key={detail.name} className="contents">
                        <dt className="text-ink-2">{detail.name}</dt>
                        <dd className="tabular text-right font-[600]">
                          {detail.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {request.note && (
                <p className="well rounded-xl px-4 py-3">« {request.note} »</p>
              )}
              {request.status === 'DECLINED' && request.declineReason && (
                <p className="rounded-xl bg-danger-soft px-4 py-3 text-danger-ink">
                  <span className="font-[650]">Refusée : </span>
                  {request.declineReason}
                </p>
              )}
            </div>
          </Card>

          {open && (
            <Card>
              <CardHeader
                title={
                  request.status === 'QUOTED'
                    ? 'Votre offre'
                    : 'Faire une offre'
                }
              />
              <form
                className="flex flex-col gap-5 px-5 pb-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  quote();
                }}
              >
                <p className="text-[0.875rem] text-ink-2">
                  {request.type === 'TRADE_IN'
                    ? 'Estimez l’ancien appareil et annoncez le prix à payer, reprise déduite. Vous vérifierez l’appareil à la remise.'
                    : request.type === 'MADE_TO_MEASURE'
                      ? 'Annoncez le prix de la pièce et le délai de confection. L’acompte prévu dans vos paramètres se règle à la commande.'
                      : 'Annoncez le prix et le délai pour vous procurer cet article.'}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={kind.priceLabel} error={errors.price}>
                    {(props) => (
                      <InputWithSuffix
                        {...props}
                        suffix={currencyLabel(request.currency)}
                        inputMode="decimal"
                        className="tabular"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Délai" error={errors.delay}>
                    {(props) => (
                      <Input
                        {...props}
                        maxLength={80}
                        value={delay}
                        placeholder="5 jours"
                        onChange={(e) => setDelay(e.target.value)}
                      />
                    )}
                  </Field>
                </div>
                {request.status === 'QUOTED' &&
                  request.quotedUnitPriceAmount !== null && (
                    <p className="tabular text-[0.875rem] text-ink-2">
                      Offre en cours :{' '}
                      {formatMoney(
                        request.quotedUnitPriceAmount * request.quantity,
                        request.currency,
                      )}{' '}
                      au total, {request.quotedDelay}.
                    </p>
                  )}
                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    variant="ghost"
                    icon={<Ban strokeWidth={1.8} />}
                    onClick={() => setDeclineOpen(true)}
                  >
                    Refuser
                  </Button>
                  <Button
                    type="submit"
                    variant={request.status === 'NEW' ? 'primary' : 'secondary'}
                    icon={<Send strokeWidth={1.8} />}
                    loading={pending === 'quote'}
                  >
                    {request.status === 'QUOTED'
                      ? 'Renvoyer l’offre'
                      : 'Envoyer l’offre'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Client" />
          <div className="flex flex-col gap-3 px-5 pb-5">
            <p className="text-[1.0625rem] font-[600]">{name}</p>
            <ul className="flex flex-col gap-2 text-[0.9375rem]">
              <li className="flex items-center gap-2.5">
                <Phone
                  className="size-4 shrink-0 text-ink-3"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <a href={`tel:${request.phone}`} className="text-ink">
                  {request.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle
                  className="size-4 shrink-0 text-ink-3"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <a
                  href={whatsapp(request.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink"
                >
                  Écrire sur WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail
                  className="size-4 shrink-0 text-ink-3"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <a
                  href={`mailto:${request.email}`}
                  className="truncate text-ink"
                >
                  {request.email}
                </a>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <DeclineDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        loading={pending === 'decline'}
        onConfirm={(reason) =>
          action.mutate(
            { action: 'decline', input: { reason } },
            {
              onSuccess: () => {
                setDeclineOpen(false);
                toast('Demande refusée');
              },
              onError: (error) =>
                toast.error(
                  error instanceof ApiError
                    ? error.message
                    : errorMessage(error),
                ),
            },
          )
        }
      />
    </>
  );
}

function DeclineDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Refuser la demande"
      description="Le motif reste visible ici ; prévenez le client par téléphone ou WhatsApp."
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason.trim()) {
            setError('Indiquez le motif.');
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
              placeholder="Modèle introuvable, délai trop long…"
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Garder la demande
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            Refuser
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
