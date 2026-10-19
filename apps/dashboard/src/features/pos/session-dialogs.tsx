import type { CashMovementType, Currency, PosSessionDto } from '@marche/contracts';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount, formatMoney, parseAmount } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Field, Input, InputWithSuffix, Textarea } from '@/shared/ui/field';
import { Tabs } from '@/shared/ui/tabs';
import { useCashMovement, useCloseSession, usePosSession } from './api';
import { denominations } from './format';

const OUT_REASONS = ['Achat de fournitures', 'Dépôt en banque', 'Avance au personnel'];
const IN_REASONS = ['Apport de monnaie', 'Remboursement d’avance'];

/** Entrée ou sortie d'espèces hors vente : le tiroir reste juste à la fermeture. */
export function MovementDialog({
  open,
  onOpenChange,
  session,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PosSessionDto;
  currency: Currency;
}) {
  const movement = useCashMovement();
  const [type, setType] = useState<CashMovementType>('OUT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setType('OUT');
      setAmount('');
      setReason('');
    }
  }, [open]);

  const value = parseAmount(amount, currency);
  const inDrawer = session.totals.expectedCash;
  const tooMuch = type === 'OUT' && value !== null && value > inDrawer;
  const ready = value !== null && value > 0 && reason.trim() !== '' && !tooMuch;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    movement.mutate(
      { sessionId: session.id, input: { type, amount: value, reason: reason.trim() } },
      {
        onSuccess: () => {
          toast(type === 'OUT' ? 'Sortie d’espèces enregistrée' : 'Entrée d’espèces enregistrée');
          onOpenChange(false);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Espèces" description={`La caisse contient ${formatMoney(inDrawer, currency)} d’après les ventes.`}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Tabs
          label="Sens du mouvement"
          value={type}
          onChange={setType}
          items={[
            { value: 'OUT', label: 'Sortie' },
            { value: 'IN', label: 'Entrée' },
          ]}
          className="self-start"
        />
        <Field
          label="Montant"
          error={amount.trim() && value === null ? 'Montant invalide.' : tooMuch ? 'La caisse ne contient pas autant d’espèces.' : undefined}
        >
          {(props) => <InputWithSuffix {...props} autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} suffix={currencyLabel(currency)} />}
        </Field>
        <Field label="Motif">
          {(props) => <Input {...props} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="-mt-2 flex flex-wrap gap-2">
          {(type === 'OUT' ? OUT_REASONS : IN_REASONS).map((option) => (
            <Button key={option} size="sm" variant="secondary" onClick={() => setReason(option)}>
              {option}
            </Button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={movement.isPending} disabled={!ready}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Fermeture de la caisse : on compte le tiroir, billet par billet ou d'un total, et l'afficheur
 * compare aux espèces attendues. L'écart reste au récapitulatif.
 */
export function CloseSessionDialog({
  open,
  onOpenChange,
  sessionId,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currency: Currency;
}) {
  const navigate = useNavigate();
  const detail = usePosSession(sessionId);
  const close = useCloseSession();
  const [mode, setMode] = useState<'coupures' | 'total'>('coupures');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [total, setTotal] = useState('');
  const [note, setNote] = useState('');
  const coins = denominations(currency);

  const { refetch } = detail;
  useEffect(() => {
    if (open) {
      setCounts({});
      setTotal('');
      setNote('');
      void refetch();
    }
  }, [open, refetch]);

  const fromCoins = coins.reduce((sum, coin) => sum + coin.amount * (Number(counts[coin.key] ?? '0') || 0), 0);
  const counted = mode === 'coupures' ? fromCoins : total.trim() === '' ? null : parseAmount(total, currency);
  const expected = detail.data?.totals.expectedCash ?? 0;
  const difference = counted === null ? null : counted - expected;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (counted === null || !detail.data) return;
    close.mutate(
      { id: sessionId, input: { countedCash: counted, version: detail.data.version, ...(note.trim() ? { note: note.trim() } : {}) } },
      {
        onSuccess: () => {
          toast('Caisse fermée');
          onOpenChange(false);
          void navigate({ to: '/pos/sessions/$sessionId', params: { sessionId } });
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Fermer la caisse" description="Comptez les espèces du tiroir.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="display-window grid grid-cols-3 divide-x divide-display-line rounded-xl py-3">
          {[
            { label: 'Attendu', value: expected },
            { label: 'Compté', value: counted ?? 0 },
            { label: 'Écart', value: difference ?? 0, signed: true },
          ].map((reading) => (
            <span key={reading.label} className="flex flex-col gap-1 px-3">
              <span className="legend flex items-center gap-1.5 text-display-dim">
                {reading.signed && difference !== null && <Led tone={difference === 0 ? 'on' : 'danger'} />}
                {reading.label}
              </span>
              <span className={cn('readout text-[1.375rem]', reading.signed && difference !== null && difference !== 0 && 'text-danger-ink')}>
                {reading.signed && reading.value > 0 ? '+' : reading.signed && reading.value < 0 ? '−' : ''}
                <AnimatedNumber value={Math.abs(reading.value)} format={(n) => formatAmount(Math.round(n), currency)} />
              </span>
            </span>
          ))}
        </div>

        <Tabs
          label="Façon de compter"
          value={mode}
          onChange={setMode}
          items={[
            { value: 'coupures', label: 'Billets et pièces' },
            { value: 'total', label: 'Total compté' },
          ]}
          className="self-start"
        />
        {mode === 'coupures' ? (
          <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {coins.map((coin) => (
              <li key={coin.key} className="flex items-center justify-between gap-3">
                <label htmlFor={`coupure-${coin.key}`} className="tabular text-[0.875rem]">
                  <span className="font-[600]">{formatMoney(coin.amount, currency)}</span>
                  <span className="text-ink-3"> {coin.kind}</span>
                </label>
                <Input
                  id={`coupure-${coin.key}`}
                  inputMode="numeric"
                  placeholder="0"
                  value={counts[coin.key] ?? ''}
                  onChange={(e) => setCounts((prev) => ({ ...prev, [coin.key]: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                  className="tabular h-9 w-20 text-right max-md:h-10"
                />
              </li>
            ))}
          </ul>
        ) : (
          <Field label="Espèces comptées" error={total.trim() && counted === null ? 'Montant invalide.' : undefined}>
            {(props) => <InputWithSuffix {...props} autoFocus inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} suffix={currencyLabel(currency)} />}
          </Field>
        )}
        <Field label="Note (facultative)" hint="Expliquez un écart : « billet de 2 000 rendu en trop »…">
          {(props) => <Textarea {...props} className="min-h-16" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Continuer à vendre
          </Button>
          <Button type="submit" variant="primary" loading={close.isPending} disabled={counted === null || !detail.data}>
            Fermer la caisse
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
