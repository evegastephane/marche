import type { Currency, PosSessionDetailDto, StoreDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Printer, ReceiptText, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { usePosSession } from '@/features/pos/api';
import { paymentLabel } from '@/features/pos/format';
import { PrintJob } from '@/features/pos/print';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount, formatMoney } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Badge, Led } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/pos/sessions/$sessionId')({ component: RecapitulatifDeCaisse });

const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const hour = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function Reading({ label, children, led }: { label: string; children: ReactNode; led?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-5 py-1 first:pl-0 max-sm:px-0 max-sm:py-3">
      <span className="legend flex items-center gap-2 text-display-dim">
        {led}
        {label}
      </span>
      {children}
    </div>
  );
}

function RecapitulatifDeCaisse() {
  const { sessionId } = Route.useParams();
  const store = useCurrentStore();
  const detail = usePosSession(sessionId);
  const [printing, setPrinting] = useState(false);

  if (detail.error) return <LoadError message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />;
  if (!detail.data || !store.data) return <Skeleton className="h-96" />;
  const session = detail.data;
  const currency = store.data.currency;
  const money = (amount: number) => formatMoney(amount, currency);
  const open = session.status === 'OPEN';
  const exact = session.difference === 0;

  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link to="/pos/sessions" className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Historique des caisses
        </Link>
      </motion.div>
      <PageHeader
        title={`Caisse du ${day.format(new Date(session.openedAt))}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone={open ? 'on' : 'off'}>{open ? 'Ouverte' : 'Fermée'}</Badge>
            <span>
              {session.label ? `${session.label} · ` : ''}
              {session.openedBy.name} · {hour.format(new Date(session.openedAt))}
              {session.closedAt ? ` – ${hour.format(new Date(session.closedAt))}` : ''}
              {session.closedBy && session.closedBy.id !== session.openedBy.id ? ` · fermée par ${session.closedBy.name}` : ''}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon={<Printer strokeWidth={1.8} />} onClick={() => setPrinting(true)}>
              Imprimer
            </Button>
            {open && (
              <Link to="/pos" className={buttonClasses('secondary')}>
                <Wallet strokeWidth={1.8} /> Aller à la caisse
              </Link>
            )}
          </>
        }
      />

      <motion.section variants={riseIn} className="display-window grid gap-0 rounded-2xl px-5 py-5 sm:grid-cols-5 sm:divide-x sm:divide-display-line">
        <Reading label="Ventes nettes">
          <span className="flex items-baseline gap-2">
            <AnimatedNumber value={session.totals.netAmount} format={(n) => formatAmount(Math.round(n), currency)} className="readout text-[2rem]" />
            <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
          </span>
        </Reading>
        <Reading label="Tickets">
          <AnimatedNumber value={session.totals.salesCount} className="readout text-[2rem]" />
        </Reading>
        <Reading label="Espèces attendues">
          <AnimatedNumber value={session.totals.expectedCash} format={(n) => formatAmount(Math.round(n), currency)} className="readout text-[2rem]" />
        </Reading>
        <Reading label="Comptées">
          {session.countedCash === null ? (
            <span className="readout text-[2rem] text-display-dim">—</span>
          ) : (
            <AnimatedNumber value={session.countedCash} format={(n) => formatAmount(Math.round(n), currency)} className="readout text-[2rem]" />
          )}
        </Reading>
        <Reading label="Écart" led={session.difference !== null ? <Led tone={exact ? 'on' : 'danger'} /> : undefined}>
          {session.difference === null ? (
            <span className="readout text-[2rem] text-display-dim">—</span>
          ) : (
            <span className={cn('readout text-[2rem]', !exact && 'text-danger-ink')}>
              {session.difference > 0 ? '+' : session.difference < 0 ? '−' : ''}
              <AnimatedNumber value={Math.abs(session.difference)} format={(n) => formatAmount(Math.round(n), currency)} />
            </span>
          )}
        </Reading>
      </motion.section>
      {session.closingNote && (
        <motion.p variants={riseIn} className="well rounded-xl px-4 py-3 text-[0.9375rem]">
          <span className="font-[600]">Note de fermeture : </span>
          {session.closingNote}
        </motion.p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="overflow-hidden">
          <CardHeader title="Par moyen de paiement" />
          {session.totals.byMethod.length === 0 ? (
            <p className="px-5 pb-5 text-ink-2">Aucun encaissement.</p>
          ) : (
            <table className="tabular w-full border-collapse text-left">
              <thead>
                <tr className="legend">
                  <th className="px-5 pb-2 font-[600]">Moyen</th>
                  <th className="px-3 pb-2 text-right font-[600]">Encaissé</th>
                  <th className="px-3 pb-2 text-right font-[600]">Rendu</th>
                  <th className="px-5 pb-2 text-right font-[600]">Net</th>
                </tr>
              </thead>
              <tbody>
                {session.totals.byMethod.map((row) => (
                  <tr key={`${row.method}-${row.provider ?? ''}`} className="border-t border-line">
                    <td className="px-5 py-2.5 font-[560]">{paymentLabel(row.method, row.provider)}</td>
                    <td className="px-3 py-2.5 text-right">{money(row.payments)}</td>
                    <td className="px-3 py-2.5 text-right text-ink-2">{row.refunds ? `−${money(row.refunds)}` : '—'}</td>
                    <td className="px-5 py-2.5 text-right font-[600]">{money(row.payments - row.refunds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Espèces" />
          <dl className="tabular flex flex-col px-5 pb-4">
            {[
              ['Fond de caisse', session.openingFloat],
              ['Encaissé en espèces', session.totals.cashPayments],
              ['Remboursé en espèces', -session.totals.cashRefunds],
              ['Entrées', session.totals.movementsIn],
              ['Sorties', -session.totals.movementsOut],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b border-line py-2 text-[0.9375rem]">
                <dt className="text-ink-2">{label}</dt>
                <dd>{(value as number) < 0 ? `−${money(-(value as number))}` : money(value as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between py-2.5 font-[650]">
              <dt>Attendu dans le tiroir</dt>
              <dd>{money(session.totals.expectedCash)}</dd>
            </div>
          </dl>
          {session.movements.length > 0 && (
            <ul className="border-t border-line">
              {session.movements.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-[0.875rem] last:border-b-0">
                  <span className="min-w-0">
                    <span className="font-[560]">{movement.type === 'IN' ? 'Entrée' : 'Sortie'}</span>
                    <span className="text-ink-2"> · {movement.reason}</span>
                  </span>
                  <span className="tabular shrink-0">
                    {movement.type === 'IN' ? '+' : '−'}
                    {money(movement.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Ventes" count={session.sales.length} />
        {session.sales.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Aucune vente" className="py-6">
            Les tickets encaissés dans cette caisse apparaîtront ici.
          </EmptyState>
        ) : (
          <ul className="border-t border-line">
            {session.sales.map((sale) => (
              <li key={sale.orderId} className="border-b border-line last:border-b-0">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: sale.orderId }}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-ink no-underline hover:bg-surface-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="tabular font-[600]">
                      n° {sale.number} <span className="font-[400] text-ink-2">· {sale.placedAt ? hour.format(new Date(sale.placedAt)) : ''}</span>
                    </span>
                    <span className="truncate text-[0.8125rem] text-ink-2">
                      {sale.itemsCount} article{sale.itemsCount > 1 ? 's' : ''} · {sale.methods.map((method) => paymentLabel(method)).join(', ') || 'offert'}
                      {sale.customerName ? ` · ${sale.customerName}` : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="tabular font-[600]">{money(sale.totalAmount)}</span>
                    {sale.refundedAmount > 0 && <span className="tabular text-[0.8125rem] text-ink-2">−{money(sale.refundedAmount)} rendu</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {session.returns.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader title="Retours" count={session.returns.length} />
          <ul className="border-t border-line">
            {session.returns.map((orderReturn) => (
              <li key={orderReturn.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
                <span className="flex min-w-0 flex-col">
                  <span className="font-[600]">
                    Ticket n° {orderReturn.orderNumber} · {orderReturn.reason}
                  </span>
                  <span className="text-[0.8125rem] text-ink-2">
                    {orderReturn.refundMethod === 'EXCHANGE' ? 'Avoir pour un échange' : paymentLabel(orderReturn.refundMethod)}
                    {orderReturn.restocked ? ' · remis en rayon' : ' · hors stock (défectueux)'}
                  </span>
                </span>
                <span className="tabular shrink-0 font-[600]">−{money(orderReturn.refundAmount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {printing && (
        <PrintJob onDone={() => setPrinting(false)}>
          <PrintedReport session={session} store={store.data} currency={currency} />
        </PrintJob>
      )}
    </div>
  );
}

/** Récapitulatif imprimé (A4) : à ranger avec les espèces déposées. */
function PrintedReport({ session, store, currency }: { session: PosSessionDetailDto; store: StoreDto; currency: Currency }) {
  const money = (amount: number) => formatMoney(amount, currency);
  const rows: [string, string][] = [
    ['Ventes nettes', money(session.totals.netAmount)],
    ['Tickets', String(session.totals.salesCount)],
    ['Articles vendus', String(session.totals.itemsCount)],
    ['Remises accordées', money(session.totals.discountAmount)],
    ['Remboursements', money(session.totals.refundAmount)],
    ['Fond de caisse', money(session.openingFloat)],
    ['Espèces attendues', money(session.totals.expectedCash)],
    ['Espèces comptées', session.countedCash === null ? '—' : money(session.countedCash)],
    ['Écart', session.difference === null ? '—' : `${session.difference > 0 ? '+' : session.difference < 0 ? '−' : ''}${money(Math.abs(session.difference))}`],
  ];
  return (
    <div className="bg-white text-[12px] leading-[1.45] text-black">
      <h1 className="text-[18px] font-bold">{store.name} : récapitulatif de caisse</h1>
      <p>
        {day.format(new Date(session.openedAt))} · {session.label ?? 'Caisse'} · {session.openedBy.name} · {hour.format(new Date(session.openedAt))}
        {session.closedAt ? ` – ${hour.format(new Date(session.closedAt))}` : ' (ouverte)'}
      </p>
      <table className="tabular mt-4 w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-black/20">
              <td className="py-1">{label}</td>
              <td className="py-1 text-right font-semibold">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-5 text-[14px] font-bold">Par moyen de paiement</h2>
      <table className="tabular w-full border-collapse">
        <tbody>
          {session.totals.byMethod.map((row) => (
            <tr key={`${row.method}-${row.provider ?? ''}`} className="border-b border-black/20">
              <td className="py-1">{paymentLabel(row.method, row.provider)}</td>
              <td className="py-1 text-right">{money(row.payments)}</td>
              <td className="py-1 text-right">{row.refunds ? `−${money(row.refunds)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {session.closingNote && <p className="mt-4">Note : {session.closingNote}</p>}
      <p className="mt-10 grid grid-cols-2 gap-8">
        <span className="border-t border-black pt-1">Signature du vendeur</span>
        <span className="border-t border-black pt-1">Signature du responsable</span>
      </p>
    </div>
  );
}
