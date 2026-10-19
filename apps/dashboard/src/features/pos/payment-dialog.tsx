import {
  allocatePayments,
  type Currency,
  enabledPaymentMethods,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PosCreditDto,
  type PosPaymentInput,
  type PosSaleDto,
  type PosSettings,
} from '@marche/contracts';
import { CircleCheck, MessageCircle, Printer, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { amountToInput, currencyLabel, formatAmount, formatMoney, parseAmount } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Field, Input, InputWithSuffix, Select } from '@/shared/ui/field';
import { EASE_OUT, glide } from '@/shared/ui/motion';
import { Tabs } from '@/shared/ui/tabs';
import { paymentLabel, quickCashAmounts } from './format';

/**
 * Encaissement d'un ticket : un ou plusieurs paiements (espèces, Mobile Money, carte, avoir d'échange).
 * L'afficheur dit ce qui reste à payer, puis la monnaie à rendre ; la vente faite, il garde la monnaie
 * en grand, le temps de la rendre, avec l'impression et l'envoi du ticket.
 */
export function PaymentDialog({
  open,
  onOpenChange,
  currency,
  total,
  settings,
  credits,
  sale,
  submitting,
  error,
  onConfirm,
  onPrint,
  whatsappHref,
  onNewSale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  total: number;
  settings: PosSettings;
  credits: PosCreditDto[];
  /** Vente enregistrée : l'écran de fin remplace l'encaissement. */
  sale: PosSaleDto | null;
  submitting: boolean;
  error: string | null;
  onConfirm: (payments: PosPaymentInput[]) => void;
  onPrint: () => void;
  whatsappHref: string | null;
  onNewSale: () => void;
}) {
  const methods = useMemo<PaymentMethod[]>(
    () => [...enabledPaymentMethods(settings), ...(credits.length > 0 ? (['EXCHANGE'] as const) : [])],
    [settings, credits.length],
  );
  const [payments, setPayments] = useState<PosPaymentInput[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('');
  const [reference, setReference] = useState('');
  const [returnId, setReturnId] = useState('');

  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(total - paid, 0);

  // Chaque ouverture repart d'un encaissement vierge, en espèces.
  useEffect(() => {
    if (!open) return;
    setPayments([]);
    setMethod('CASH');
    setAmount('');
    setReference('');
    setProvider(settings.mobileMoneyProviders[0] ?? '');
    setReturnId(credits[0]?.returnId ?? '');
  }, [open, settings.mobileMoneyProviders, credits]);

  const credit = credits.find((candidate) => candidate.returnId === returnId) ?? null;
  const choose = (next: PaymentMethod) => {
    setMethod(next);
    setReference('');
    // Hors espèces, on propose le reste à payer (jamais plus, il n'y a pas de monnaie à rendre).
    if (next === 'CASH') setAmount('');
    else if (next === 'EXCHANGE') setAmount(amountToInput(Math.min(remaining, credit?.creditRemaining ?? credits[0]?.creditRemaining ?? 0), currency));
    else setAmount(remaining > 0 ? amountToInput(remaining, currency) : '');
  };

  const draftAmount = amount.trim() === '' ? null : parseAmount(amount, currency);
  const draft: PosPaymentInput | null =
    draftAmount && draftAmount > 0
      ? {
          method,
          amount: draftAmount,
          ...(method === 'MOBILE_MONEY' && provider ? { provider } : {}),
          ...(reference.trim() && method !== 'CASH' && method !== 'EXCHANGE' ? { reference: reference.trim() } : {}),
          ...(method === 'EXCHANGE' && returnId ? { returnId } : {}),
        }
      : null;
  const candidates = draft ? [...payments, draft] : payments;
  const allocation = allocatePayments(total, candidates);
  const creditTooLow = method === 'EXCHANGE' && draft !== null && credit !== null && draft.amount > credit.creditRemaining;
  const ready = allocation.ok && !creditTooLow && (total === 0 || candidates.length > 0);

  const addDraft = () => {
    if (!draft || creditTooLow) return;
    setPayments((prev) => [...prev, draft]);
    setAmount('');
    setReference('');
    const nextRemaining = Math.max(remaining - draft.amount, 0);
    if (method !== 'CASH' && nextRemaining > 0) setMethod('CASH');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready && !submitting) onConfirm(candidates);
  };

  const quick = method === 'CASH' ? [remaining, ...quickCashAmounts(remaining, currency)].filter((value, index, all) => value > 0 && all.indexOf(value) === index) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (!next && sale) onNewSale();
        else onOpenChange(next);
      }}
      title={sale ? `Ticket n° ${sale.order.number}` : 'Encaisser'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sale ? (
          <motion.div
            key="fait"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="flex flex-col gap-5"
          >
            <div className="display-window flex flex-col gap-1 rounded-xl px-4 py-4">
              <span className="legend text-display-dim">{sale.changeAmount > 0 ? 'Monnaie à rendre' : 'Payé'}</span>
              <span className="flex items-baseline gap-2">
                <AnimatedNumber
                  value={sale.changeAmount > 0 ? sale.changeAmount : sale.order.totalAmount}
                  format={(n) => formatAmount(Math.round(n), currency)}
                  className="readout text-[3rem]"
                />
                <span className="text-[1rem] text-display-dim">{currencyLabel(currency)}</span>
              </span>
            </div>
            <p className="flex items-center gap-2 text-ink-2">
              <CircleCheck className="size-5 shrink-0 text-ink" strokeWidth={1.8} aria-hidden />
              Vente enregistrée : {formatMoney(sale.order.totalAmount, currency)}, stock mis à jour.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Printer strokeWidth={1.8} />} onClick={onPrint}>
                Imprimer le ticket
              </Button>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClasses('secondary', 'md')}>
                  <MessageCircle strokeWidth={1.8} /> Envoyer sur WhatsApp
                </a>
              )}
            </div>
            <Button variant="primary" size="lg" className="w-full" autoFocus onClick={onNewSale}>
              Nouvelle vente
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="encaisser"
            onSubmit={submit}
            initial={false}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
            className="flex flex-col gap-5"
          >
            <div className="display-window flex flex-col gap-2 rounded-xl px-4 py-3.5">
              <span className="tabular flex justify-between text-[0.875rem] text-display-dim">
                <span>Total du ticket</span>
                <span>{formatMoney(total, currency)}</span>
              </span>
              <span className="flex items-end justify-between gap-4">
                <span className="legend pb-1 text-display-dim">
                  {allocation.ok ? (allocation.changeAmount > 0 ? 'Monnaie à rendre' : 'Compte juste') : 'Reste à payer'}
                </span>
                <span className="flex items-baseline gap-2">
                  <AnimatedNumber
                    value={allocation.ok ? allocation.changeAmount : allocation.reason === 'INSUFFICIENT' ? allocation.missingAmount : remaining}
                    format={(n) => formatAmount(Math.round(n), currency)}
                    className="readout text-[2.25rem]"
                  />
                  <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
                </span>
              </span>
            </div>

            {payments.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {payments.map((payment, index) => (
                  <motion.li
                    key={`${payment.method}-${index}`}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={glide}
                    className="well flex items-center justify-between gap-3 rounded-xl py-1.5 pr-1.5 pl-3.5"
                  >
                    <span className="text-[0.875rem] font-[560]">
                      {paymentLabel(payment.method, payment.provider)}
                      {payment.reference ? <span className="text-ink-2"> · {payment.reference}</span> : null}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="tabular font-[600]">{formatMoney(payment.amount, currency)}</span>
                      <button
                        type="button"
                        aria-label="Retirer ce paiement"
                        onClick={() => setPayments((prev) => prev.filter((_, i) => i !== index))}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface hover:text-ink"
                      >
                        <X className="size-4" strokeWidth={1.8} />
                      </button>
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}

            <Tabs
              label="Moyen de paiement"
              value={method}
              onChange={choose}
              items={methods.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))}
            />

            {method === 'MOBILE_MONEY' && (
              <Tabs
                label="Opérateur"
                value={provider}
                onChange={setProvider}
                items={settings.mobileMoneyProviders.map((value) => ({ value, label: value }))}
              />
            )}
            {method === 'EXCHANGE' && credits.length > 1 && (
              <Field label="Avoir">
                {(props) => (
                  <Select {...props} value={returnId} onChange={(e) => setReturnId(e.target.value)}>
                    {credits.map((option) => (
                      <option key={option.returnId} value={option.returnId}>
                        Retour du ticket n° {option.orderNumber} : {formatMoney(option.creditRemaining, currency)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <Field
              label={method === 'CASH' ? 'Espèces reçues' : 'Montant'}
              error={
                amount.trim() && draftAmount === null
                  ? 'Montant invalide.'
                  : creditTooLow
                    ? `L’avoir ne couvre que ${formatMoney(credit!.creditRemaining, currency)}.`
                    : !allocation.ok && allocation.reason === 'NON_CASH_EXCEEDS'
                      ? 'Seules les espèces rendent la monnaie : ce montant dépasse le total.'
                      : undefined
              }
            >
              {(props) => (
                <InputWithSuffix
                  {...props}
                  autoFocus
                  inputMode="decimal"
                  placeholder={amountToInput(remaining, currency)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  suffix={currencyLabel(currency)}
                  className="h-12 text-[1.125rem]"
                />
              )}
            </Field>
            {quick.length > 0 && (
              <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="Montants rapides">
                {quick.map((value, index) => (
                  <Button key={value} size="sm" variant="secondary" onClick={() => setAmount(amountToInput(value, currency))}>
                    <span className="tabular">{index === 0 ? `Compte juste · ${formatMoney(value, currency)}` : formatMoney(value, currency)}</span>
                  </Button>
                ))}
              </div>
            )}
            {(method === 'MOBILE_MONEY' || method === 'CARD' || method === 'BANK_TRANSFER' || method === 'OTHER') && (
              <Field label="Référence de la transaction (facultative)" hint="Le numéro du SMS de confirmation, pour retrouver le paiement.">
                {(props) => <Input {...props} maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />}
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] font-[560] text-danger-ink">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                disabled={!draft || creditTooLow || draft.amount >= remaining}
                onClick={addDraft}
              >
                Payer le reste autrement
              </Button>
              <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={!ready}>
                Valider l’encaissement
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
