import type { Currency, PaymentMethod, PosSaleDto, PosSaleSummaryDto, PosSettings } from '@marche/contracts';
import { Printer, ReceiptText, Undo2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Select } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import { Tabs } from '@/shared/ui/tabs';
import { useCreateReturn, useFindSaleByNumber, usePosSale, usePosSession } from './api';
import { paymentLabel } from './format';

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Ventes de la caisse ouverte : réimprimer un ticket, reprendre un article ; un ancien ticket se retrouve par son numéro. */
export function SalesDialog({
  open,
  onOpenChange,
  sessionId,
  currency,
  onReprint,
  onReturn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currency: Currency;
  onReprint: (orderId: string) => void;
  onReturn: (orderId: string) => void;
}) {
  const detail = usePosSession(sessionId);
  const find = useFindSaleByNumber();
  const [number, setNumber] = useState('');
  const sales = detail.data?.sales ?? [];

  const search = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(number.replace(/\D/g, ''));
    if (!value) return;
    find.mutate(value, {
      onSuccess: (sale) => {
        if (!sale) toast.error(`Aucune vente en caisse porte le numéro ${value}.`);
        else {
          setNumber('');
          onReturn(sale.order.id);
        }
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Ventes de la caisse" description="Réimprimez un ticket ou reprenez un article.">
      <form onSubmit={search} className="flex gap-2">
        <Input
          aria-label="Numéro d’un ticket"
          inputMode="numeric"
          placeholder="N° d’un ticket plus ancien"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="tabular"
        />
        <Button type="submit" variant="secondary" loading={find.isPending} disabled={!number.trim()}>
          Retrouver
        </Button>
      </form>
      {detail.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Aucune vente pour l’instant" className="px-0 py-4">
          Les tickets encaissés dans cette caisse apparaîtront ici.
        </EmptyState>
      ) : (
        <ul className="-mx-2 flex max-h-[52dvh] flex-col overflow-y-auto">
          {sales.map((sale) => (
            <SaleRow key={sale.orderId} sale={sale} currency={currency} onReprint={onReprint} onReturn={onReturn} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function SaleRow({
  sale,
  currency,
  onReprint,
  onReturn,
}: {
  sale: PosSaleSummaryDto;
  currency: Currency;
  onReprint: (orderId: string) => void;
  onReturn: (orderId: string) => void;
}) {
  const refunded = sale.refundedAmount >= sale.totalAmount && sale.totalAmount > 0;
  return (
    <li className="flex items-center justify-between gap-3 rounded-[0.7rem] px-2 py-2.5 hover:bg-surface-2">
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2">
          <span className="tabular font-[650]">n° {sale.number}</span>
          <span className="tabular text-[0.8125rem] text-ink-2">{sale.placedAt ? time.format(new Date(sale.placedAt)) : ''}</span>
          {sale.refundedAmount > 0 && <Badge tone={refunded ? 'off' : 'attention'}>{refunded ? 'Remboursé' : 'Retour partiel'}</Badge>}
        </span>
        <span className="truncate text-[0.8125rem] text-ink-2">
          {sale.itemsCount} article{sale.itemsCount > 1 ? 's' : ''} · {sale.methods.map((method: PaymentMethod) => paymentLabel(method)).join(', ') || 'offert'}
          {sale.customerName ? ` · ${sale.customerName}` : ''}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="tabular mr-2 font-[600]">{formatMoney(sale.totalAmount, currency)}</span>
        <Button size="sm" variant="ghost" aria-label={`Réimprimer le ticket ${sale.number}`} onClick={() => onReprint(sale.orderId)}>
          <Printer strokeWidth={1.8} />
        </Button>
        <Button size="sm" variant="ghost" aria-label={`Retour sur le ticket ${sale.number}`} disabled={refunded} onClick={() => onReturn(sale.orderId)}>
          <Undo2 strokeWidth={1.8} />
        </Button>
      </span>
    </li>
  );
}

const REASONS = ['Défectueux', 'Ne convient pas', 'Erreur de taille ou de modèle'];

/**
 * Retour d'articles d'un ticket : quantités (et IMEI des appareils) rapportées, remise en rayon,
 * puis remboursement. Un vendeur rend un avoir (échange) ; un administrateur peut aussi rembourser.
 */
export function ReturnDialog({
  orderId,
  onClose,
  sessionId,
  currency,
  settings,
  isAdmin,
}: {
  orderId: string | null;
  onClose: () => void;
  sessionId: string;
  currency: Currency;
  settings: PosSettings;
  isAdmin: boolean;
}) {
  const sale = usePosSale(orderId);
  const create = useCreateReturn();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [serials, setSerials] = useState<Record<string, string[]>>({});
  const [restock, setRestock] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('EXCHANGE');
  const [provider, setProvider] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!orderId) return;
    setQuantities({});
    setSerials({});
    setRestock(true);
    setMethod('EXCHANGE');
    setProvider(settings.mobileMoneyProviders[0] ?? '');
    setReason('');
    setKey(crypto.randomUUID());
  }, [orderId, settings.mobileMoneyProviders]);

  const order = sale.data?.order;
  const returned = new Map<string, { quantity: number; serials: Set<string> }>();
  for (const orderReturn of order?.returns ?? []) {
    for (const line of orderReturn.lines) {
      const entry = returned.get(line.orderLineId) ?? { quantity: 0, serials: new Set<string>() };
      entry.quantity += line.quantity;
      for (const serial of line.serials) entry.serials.add(serial);
      returned.set(line.orderLineId, entry);
    }
  }
  const netRatio = order && order.subtotalAmount > 0 ? (order.subtotalAmount - order.discountAmount) / order.subtotalAmount : 0;
  const lines = (order?.lines ?? []).map((line) => {
    const tracked = line.serialNumbers.length > 0;
    const count = tracked ? (serials[line.id]?.length ?? 0) : (quantities[line.id] ?? 0);
    return { line, tracked, remaining: line.quantity - (returned.get(line.id)?.quantity ?? 0), count };
  });
  const chosen = lines.filter((entry) => entry.count > 0);
  const estimate = Math.min(
    chosen.reduce((sum, entry) => sum + Math.round(entry.line.unitPriceAmount * entry.count * netRatio), 0),
    order ? order.totalAmount - order.refundedAmount : 0,
  );
  const methods: PaymentMethod[] = isAdmin
    ? ['EXCHANGE', 'CASH', ...(settings.mobileMoneyProviders.length ? (['MOBILE_MONEY'] as const) : []), ...(settings.acceptCard ? (['CARD'] as const) : []), 'OTHER']
    : ['EXCHANGE'];
  const ready = chosen.length > 0 && reason.trim() !== '' && (method !== 'MOBILE_MONEY' || provider !== '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!orderId || !ready) return;
    create.mutate(
      {
        orderId,
        key,
        input: {
          sessionId,
          lines: chosen.map((entry) => ({
            orderLineId: entry.line.id,
            quantity: entry.count,
            serials: entry.tracked ? (serials[entry.line.id] ?? []) : [],
          })),
          restock,
          refund: { method, ...(method === 'MOBILE_MONEY' && provider ? { provider } : {}) },
          reason: reason.trim(),
        },
      },
      {
        onSuccess: ({ orderReturn }) => {
          toast(
            orderReturn.refundMethod === 'EXCHANGE'
              ? `Avoir de ${formatMoney(orderReturn.refundAmount, currency)} : il paiera la vente de l’échange.`
              : `Remboursé : ${formatMoney(orderReturn.refundAmount, currency)} en ${paymentLabel(orderReturn.refundMethod, provider).toLowerCase()}.`,
          );
          onClose();
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog
      open={orderId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={order ? `Retour sur le ticket n° ${order.number}` : 'Retour'}
      description="Indiquez ce que le client rapporte."
    >
      {!order ? (
        <Skeleton className="h-40" />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <ul className="flex flex-col gap-3">
            {lines.map(({ line, tracked, remaining, count }) => (
              <li key={line.id} className="well flex flex-col gap-2 rounded-xl px-3.5 py-3">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-[600]">{line.productTitle}</span>
                    <span className="tabular block text-[0.8125rem] text-ink-2">
                      {line.quantity} × {formatMoney(line.unitPriceAmount, currency)}
                      {remaining < line.quantity ? ` · ${line.quantity - remaining} déjà rapporté${line.quantity - remaining > 1 ? 's' : ''}` : ''}
                    </span>
                  </span>
                  {!tracked && remaining > 0 && (
                    <select
                      aria-label={`Quantité rapportée de ${line.productTitle}`}
                      value={count}
                      onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
                      className="tabular h-9 rounded-lg bg-surface px-2 font-[600] shadow-[0_0_0_1px_var(--color-line-strong)]"
                    >
                      {Array.from({ length: remaining + 1 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  )}
                  {remaining === 0 && <Badge tone="off">Rapporté</Badge>}
                </span>
                {tracked && (
                  <span className="flex flex-col gap-1.5">
                    {line.serialNumbers.map((serial) => {
                      const done = returned.get(line.id)?.serials.has(serial) ?? false;
                      const checked = serials[line.id]?.includes(serial) ?? false;
                      return (
                        <label key={serial} className="flex items-center gap-2.5 text-[0.875rem]">
                          <input
                            type="checkbox"
                            disabled={done}
                            checked={checked}
                            onChange={(e) =>
                              setSerials((prev) => ({
                                ...prev,
                                [line.id]: e.target.checked ? [...(prev[line.id] ?? []), serial] : (prev[line.id] ?? []).filter((value) => value !== serial),
                              }))
                            }
                            className="size-4 accent-[var(--color-ink)]"
                          />
                          <span className="tabular">IMEI {serial}</span>
                          {done && <span className="text-ink-3">déjà rapporté</span>}
                        </label>
                      );
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
            <Switch checked={restock} onChange={setRestock} />
            <span className="flex flex-col">
              <span className="font-[600]">Remettre en rayon</span>
              <span className="text-[0.875rem] text-ink-2">Éteint pour un article défectueux : il ne revient pas dans le stock.</span>
            </span>
          </label>

          <Field label="Motif">{(props) => <Input {...props} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          <div className="-mt-2 flex flex-wrap gap-2">
            {REASONS.map((option) => (
              <Button key={option} size="sm" variant="secondary" onClick={() => setReason(option)}>
                {option}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Tabs
              label="Remboursement"
              value={method}
              onChange={setMethod}
              items={methods.map((value) => ({ value, label: value === 'EXCHANGE' ? 'Avoir (échange)' : paymentLabel(value) }))}
            />
            {method === 'MOBILE_MONEY' && (
              <Select aria-label="Opérateur" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {settings.mobileMoneyProviders.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
            {!isAdmin && <p className="text-[0.8125rem] text-ink-2">Rembourser en argent est réservé aux administrateurs.</p>}
          </div>

          <div className="display-window flex items-end justify-between gap-4 rounded-xl px-4 py-3">
            <span className="legend pb-1 text-display-dim">{method === 'EXCHANGE' ? 'Avoir' : 'À rembourser'}</span>
            <span className="readout tabular text-[1.75rem]">{formatMoney(estimate, currency)}</span>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={create.isPending} disabled={!ready}>
              Valider le retour
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Le ticket d'une vente, rechargé pour la réimpression. */
export function useReprintSale(orderId: string | null): PosSaleDto | undefined {
  return usePosSale(orderId).data;
}
