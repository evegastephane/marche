import type { Currency } from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import { History, Wallet } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { currencyLabel, formatAmount, parseAmount } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { IconBadge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field, Input, InputWithSuffix } from '@/shared/ui/field';
import { useOpenSession } from './api';

/**
 * Ouverture de la caisse : le vendeur compte les espèces du tiroir (le fond), lui donne un nom
 * s'il y a plusieurs comptoirs, puis commence à encaisser.
 */
export function OpenSession({ currency }: { currency: Currency }) {
  const open = useOpenSession();
  const [float, setFloat] = useState('');
  const [label, setLabel] = useState('');
  const amount = float.trim() === '' ? 0 : parseAmount(float, currency);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null) return;
    open.mutate(
      { openingFloat: amount, ...(label.trim() ? { label: label.trim() } : {}) },
      {
        onSuccess: () => toast('Caisse ouverte'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Card className="mx-auto flex w-full max-w-[34rem] flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <IconBadge icon={Wallet} size="lg" />
        <div className="flex flex-col gap-1.5">
          <h2 className="heading text-[1.25rem]">Ouvrir la caisse</h2>
          <p className="text-ink-2">Comptez les espèces du tiroir avant la première vente : c’est le fond de caisse, retrouvé à la fermeture.</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="display-window flex items-end justify-between gap-4 rounded-xl px-4 py-3.5">
          <span className="legend pb-1 text-display-dim">Fond de caisse</span>
          <span className="flex items-baseline gap-2">
            <AnimatedNumber value={amount ?? 0} format={(n) => formatAmount(Math.round(n), currency)} className="readout text-[2rem]" />
            <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
          </span>
        </div>
        <Field label="Espèces dans le tiroir" error={amount === null ? 'Montant invalide.' : undefined} hint="Laissez vide si le tiroir est vide.">
          {(props) => (
            <InputWithSuffix
              {...props}
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={float}
              onChange={(e) => setFloat(e.target.value)}
              suffix={currencyLabel(currency)}
            />
          )}
        </Field>
        <Field label="Nom de la caisse (facultatif)" hint="Utile avec plusieurs comptoirs : « Comptoir », « Boutique Plateau »…">
          {(props) => <Input {...props} maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/pos/sessions" className={buttonClasses('ghost', 'md')}>
            <History strokeWidth={1.8} /> Historique des caisses
          </Link>
          <Button type="submit" variant="primary" size="lg" loading={open.isPending} disabled={amount === null}>
            Ouvrir la caisse
          </Button>
        </div>
      </form>
    </Card>
  );
}
