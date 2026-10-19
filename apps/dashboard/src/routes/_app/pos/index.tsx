import type { PosPaymentInput, PosSaleDto, PosSessionDto, PosSettings, PosVariantDto, StoreDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Banknote, History, ReceiptText } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateSale,
  useCurrentSession,
  useIsStoreAdmin,
  usePosCredits,
  usePosQuote,
  usePosSale,
  usePosSettings,
} from '@/features/pos/api';
import { CatalogPanel } from '@/features/pos/catalog-panel';
import { whatsappLink } from '@/features/pos/format';
import { OpenSession } from '@/features/pos/open-session';
import { PaymentDialog } from '@/features/pos/payment-dialog';
import { PrintJob } from '@/features/pos/print';
import { Receipt } from '@/features/pos/receipt';
import { ReturnDialog, SalesDialog } from '@/features/pos/sales-dialogs';
import { CloseSessionDialog, MovementDialog } from '@/features/pos/session-dialogs';
import { useTicket } from '@/features/pos/ticket';
import { CustomerDialog, CustomLineDialog, DiscountDialog } from '@/features/pos/ticket-dialogs';
import { TicketPanel } from '@/features/pos/ticket-panel';
import { UnitPicker } from '@/features/pos/unit-picker';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite } from '@/features/site/api';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount, formatMoney } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT } from '@/shared/ui/motion';
import { Tabs } from '@/shared/ui/tabs';

export const Route = createFileRoute('/_app/pos/')({ component: Caisse });

const hour = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Caisse : on ouvre sa caisse, puis on encaisse au comptoir, ticket après ticket. */
function Caisse() {
  const store = useCurrentStore();
  const current = useCurrentSession();
  const settings = usePosSettings();

  if (current.error || settings.error) {
    return <LoadError message={errorMessage(current.error ?? settings.error)} onRetry={() => void current.refetch()} />;
  }
  if (!store.data || current.isPending || !settings.data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <Skeleton className="h-[32rem]" />
          <Skeleton className="h-[24rem]" />
        </div>
      </div>
    );
  }
  if (!current.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Caisse" subtitle="Encaissez au comptoir : le stock, les clients et les ventes se mettent à jour d’eux-mêmes." />
        <OpenSession currency={store.data.currency} />
      </div>
    );
  }
  return <Terminal session={current.data} store={store.data} settings={settings.data} />;
}

/** Valeur stabilisée après une courte pause : le devis n'est pas recalculé à chaque touche. */
function useSettled<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function Terminal({ session, store, settings }: { session: PosSessionDto; store: StoreDto; settings: PosSettings }) {
  const currency = store.currency;
  const isAdmin = useIsStoreAdmin();
  const ticket = useTicket(session.id);
  const quoteInput = useSettled(ticket.quoteInput);
  const quote = usePosQuote(quoteInput);
  const credits = usePosCredits(session.id);
  const site = useSite();
  const createSale = useCreateSale();

  const [tab, setTab] = useState<'articles' | 'ticket'>('articles');
  const [unitFor, setUnitFor] = useState<PosVariantDto | null>(null);
  const [dialog, setDialog] = useState<'customer' | 'discount' | 'custom' | 'payment' | 'movement' | 'close' | 'sales' | null>(null);
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
  const [completed, setCompleted] = useState<PosSaleDto | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<PosSaleDto | null>(null);
  const [reprintId, setReprintId] = useState<string | null>(null);
  const reprint = usePosSale(reprintId);

  // Un ticket à réimprimer part à l'impression dès qu'il est chargé.
  useEffect(() => {
    if (reprint.data && reprintId) {
      setPrinting(reprint.data);
      setReprintId(null);
    }
  }, [reprint.data, reprintId]);

  const quoteError =
    quote.error instanceof ApiError
      ? quote.error.code === 'DISCOUNT_NOT_ALLOWED'
        ? (quote.error.problem?.detail ?? quote.error.message)
        : quote.error.code === 'ITEM_UNAVAILABLE'
          ? 'Un article du ticket n’est plus en vente : retirez-le.'
          : null
      : null;
  const total = quote.data?.totalAmount ?? ticket.subtotal;
  // Le total affiché doit être celui du ticket actuel : on n'encaisse pas pendant le calcul.
  const pricing = ticket.quoteInput !== null && (quoteInput !== ticket.quoteInput || quote.isFetching || quote.isPlaceholderData);

  // « Encaisser » pendant le calcul : l'encaissement s'ouvre dès que le total est connu.
  const [checkoutWaiting, setCheckoutWaiting] = useState(false);
  const checkout = useCallback(() => {
    if (ticket.itemsCount === 0 || quoteError) return;
    if (pricing) {
      setCheckoutWaiting(true);
      return;
    }
    setPaymentError(null);
    setCompleted(null);
    setDialog('payment');
  }, [ticket.itemsCount, quoteError, pricing]);
  useEffect(() => {
    if (checkoutWaiting && !pricing) {
      setCheckoutWaiting(false);
      checkout();
    }
  }, [checkoutWaiting, pricing, checkout]);

  // F2 : encaisser, depuis le clavier de la caisse.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F2' && dialog === null) {
        event.preventDefault();
        checkout();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkout, dialog]);

  const newSale = () => {
    setCompleted(null);
    setDialog(null);
    setTab('articles');
  };

  const siteUrl = site.data?.status === 'PUBLISHED' ? site.data.url : null;
  const trackingUrl = (sale: PosSaleDto) => (siteUrl ? `${siteUrl}/orders/${sale.order.publicToken}` : null);
  const completedPhone = completed?.order.customer?.phone;
  const completedTracking = completed ? trackingUrl(completed) : null;
  const whatsappHref =
    completed && completedPhone
      ? whatsappLink(
          completedPhone,
          store.country,
          [
            `${store.name} : merci pour votre achat !`,
            `Ticket n° ${completed.order.number} : ${formatMoney(completed.order.totalAmount, currency)}.`,
            ...(completedTracking ? [`Votre ticket : ${completedTracking}`] : []),
          ].join('\n'),
        )
      : null;

  const confirm = (payments: PosPaymentInput[]) => {
    setPaymentError(null);
    createSale.mutate(
      { input: { ...ticket.saleInput(session.id), payments }, key: saleKey },
      {
        onSuccess: (sale) => {
          setCompleted(sale);
          ticket.dispatch({ type: 'reset' });
          setSaleKey(crypto.randomUUID());
        },
        onError: (error) => {
          setPaymentError(
            error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK'
              ? 'Stock insuffisant pour au moins un article : vérifiez les quantités du ticket.'
              : errorMessage(error),
          );
          // Une erreur métier ne laisse rien d'écrit : la tentative suivante prend une nouvelle clé.
          if (error instanceof ApiError && error.status < 500) setSaleKey(crypto.randomUUID());
        },
      },
    );
  };

  const clear = () => {
    const snapshot = ticket.ticket;
    ticket.dispatch({ type: 'reset' });
    toast('Ticket vidé', { action: { label: 'Annuler', onClick: () => ticket.dispatch({ type: 'load', ticket: snapshot }) } });
  };

  const salesCount = session.totals.salesCount;

  return (
    <div className="flex flex-col gap-5 max-lg:pb-24">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: EASE_OUT }}
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="display text-[1.875rem] md:text-[2.25rem]">Caisse</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <Badge tone="on">{session.label ?? 'Ouverte'}</Badge>
            <span>
              {session.openedBy.name} · depuis {hour.format(new Date(session.openedAt))}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="display-window hidden items-baseline gap-2 rounded-xl px-3.5 py-2 sm:flex">
            <span className="legend text-display-dim">Espèces</span>
            <AnimatedNumber value={session.totals.expectedCash} format={(n) => formatAmount(Math.round(n), currency)} className="readout text-[1.25rem]" />
            <span className="text-[0.8125rem] text-display-dim">{currencyLabel(currency)}</span>
          </span>
          <Button size="sm" variant="secondary" icon={<ReceiptText strokeWidth={1.8} />} onClick={() => setDialog('sales')}>
            Ventes <span className="tabular text-ink-3">{salesCount}</span>
          </Button>
          <Button size="sm" variant="secondary" icon={<Banknote strokeWidth={1.8} />} onClick={() => setDialog('movement')}>
            Espèces
          </Button>
          <Link to="/pos/sessions" className={buttonClasses('ghost', 'sm')}>
            <History strokeWidth={1.8} /> Historique
          </Link>
          <Button size="sm" variant="ghost" onClick={() => setDialog('close')}>
            Fermer la caisse
          </Button>
        </div>
      </motion.header>

      <Tabs
        label="Affichage de la caisse"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'articles', label: 'Articles' },
          { value: 'ticket', label: 'Ticket', count: ticket.itemsCount },
        ]}
        className="self-start lg:hidden"
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-6">
        <CatalogPanel currency={currency} ticket={ticket} onNeedUnit={setUnitFor} className={cn(tab === 'ticket' && 'max-lg:hidden')} />
        <TicketPanel
          currency={currency}
          ticket={ticket}
          quote={quote.data}
          quoteError={quoteError}
          pricing={checkoutWaiting}
          onCustomer={() => setDialog('customer')}
          onDiscount={() => setDialog('discount')}
          onCustomLine={() => setDialog('custom')}
          onCheckout={checkout}
          onClear={clear}
          className={cn('lg:sticky lg:top-6', tab === 'articles' && 'max-lg:hidden')}
        />
      </div>

      {/* Au téléphone, sous la liste des articles : le ticket en une ligne, et sa touche. */}
      <AnimatePresence>
        {tab === 'articles' && ticket.itemsCount > 0 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 rounded-2xl bg-surface p-2.5 pl-4 shadow-float ring-1 ring-line lg:hidden"
          >
            <button type="button" onClick={() => setTab('ticket')} className="flex min-w-0 flex-col text-left">
              <span className="text-[0.8125rem] text-ink-2">
                {ticket.itemsCount} article{ticket.itemsCount > 1 ? 's' : ''} · voir le ticket
              </span>
              <span className="tabular font-[650]">{formatMoney(total, currency)}</span>
            </button>
            <Button variant="primary" onClick={checkout} loading={checkoutWaiting} disabled={quoteError !== null}>
              Encaisser
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <UnitPicker
        variant={unitFor}
        taken={ticket.ticket.lines.find((line) => line.variantId === unitFor?.variantId)?.serials ?? []}
        currency={currency}
        onClose={() => setUnitFor(null)}
        onPick={(serial) => {
          if (unitFor) ticket.add(unitFor, serial);
          setUnitFor(null);
        }}
      />
      <CustomerDialog
        open={dialog === 'customer'}
        onOpenChange={(open) => setDialog(open ? 'customer' : null)}
        customer={ticket.ticket.customer}
        onSave={(customer) => ticket.dispatch({ type: 'customer', customer })}
      />
      <DiscountDialog
        open={dialog === 'discount'}
        onOpenChange={(open) => setDialog(open ? 'discount' : null)}
        currency={currency}
        base={Math.max((quote.data?.subtotalAmount ?? ticket.subtotal) - (quote.data?.discounts.filter((d) => d.bundleId !== null).reduce((sum, d) => sum + d.amount, 0) ?? 0), 0)}
        discount={ticket.ticket.discount}
        maxPercent={isAdmin ? null : settings.staffDiscountMaxPercent}
        onSave={(discount) => ticket.dispatch({ type: 'discount', discount })}
      />
      <CustomLineDialog
        open={dialog === 'custom'}
        onOpenChange={(open) => setDialog(open ? 'custom' : null)}
        currency={currency}
        onAdd={(line) => ticket.dispatch({ type: 'addCustom', line })}
      />
      <PaymentDialog
        open={dialog === 'payment'}
        onOpenChange={(open) => setDialog(open ? 'payment' : null)}
        currency={currency}
        total={total}
        settings={settings}
        credits={credits.data ?? []}
        sale={completed}
        submitting={createSale.isPending}
        error={paymentError}
        onConfirm={confirm}
        onPrint={() => completed && setPrinting(completed)}
        whatsappHref={whatsappHref}
        onNewSale={newSale}
      />
      <MovementDialog open={dialog === 'movement'} onOpenChange={(open) => setDialog(open ? 'movement' : null)} session={session} currency={currency} />
      <CloseSessionDialog open={dialog === 'close'} onOpenChange={(open) => setDialog(open ? 'close' : null)} sessionId={session.id} currency={currency} />
      <SalesDialog
        open={dialog === 'sales'}
        onOpenChange={(open) => setDialog(open ? 'sales' : null)}
        sessionId={session.id}
        currency={currency}
        onReprint={(orderId) => setReprintId(orderId)}
        onReturn={(orderId) => {
          setDialog(null);
          setReturnFor(orderId);
        }}
      />
      <ReturnDialog orderId={returnFor} onClose={() => setReturnFor(null)} sessionId={session.id} currency={currency} settings={settings} isAdmin={isAdmin} />

      {printing && (
        <PrintJob roll onDone={() => setPrinting(null)}>
          <Receipt sale={printing} store={store} settings={settings} trackingUrl={trackingUrl(printing)} />
        </PrintJob>
      )}
    </div>
  );
}
