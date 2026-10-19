import { type Currency, type CustomerDto, type Paginated, posDiscountAmount, type PosDiscountInput } from '@marche/contracts';
import { useQuery } from '@tanstack/react-query';
import { UserRoundCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { customerName } from '@/features/customers/api';
import { qk } from '@/shared/api/query-keys';
import { useApi, useStoreKey } from '@/shared/api/use-api';
import { amountToInput, currencyLabel, formatMoney, parseAmount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Field, Input, InputWithSuffix } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import { Tabs } from '@/shared/ui/tabs';
import type { TicketCustomer } from './ticket';

/** Client déjà connu de la boutique, retrouvé par les chiffres de son téléphone. */
function useKnownCustomer(phone: string) {
  const api = useApi();
  const store = useStoreKey();
  const digits = phone.replace(/\D/g, '');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(digits.length >= 8 ? digits.slice(-8) : ''), 300);
    return () => window.clearTimeout(timer);
  }, [digits]);
  return useQuery({
    queryKey: [...qk.customers(store), 'telephone', debounced],
    queryFn: async ({ signal }) =>
      (await api<Paginated<CustomerDto>>('GET', '/api/v1/customers', { signal, query: { q: debounced, limit: 1 } })).items[0] ?? null,
    enabled: debounced !== '',
    staleTime: 60_000,
  });
}

/**
 * Client du ticket : son téléphone suffit (il est retrouvé s'il a déjà acheté), l'e-mail est facultatif
 * et lui envoie son ticket. Il rejoint la page Clients.
 */
export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: TicketCustomer | null;
  onSave: (customer: TicketCustomer | null) => void;
}) {
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const known = useKnownCustomer(phone);

  useEffect(() => {
    if (!open) return;
    setPhone(customer?.phone ?? '');
    setFirstName(customer?.firstName ?? '');
    setLastName(customer?.lastName ?? '');
    setEmail(customer?.email ?? '');
    setWhatsapp(customer?.whatsappOptIn ?? false);
    setError(null);
  }, [open, customer]);

  const match = known.data;
  useEffect(() => {
    if (!match) return;
    setFirstName((value) => value || match.firstName || '');
    setLastName((value) => value || match.lastName || '');
    setEmail((value) => value || match.email || '');
  }, [match]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!phone.trim() && !cleanEmail) {
      setError('Un téléphone ou un e-mail est nécessaire.');
      return;
    }
    if (phone.trim() && phone.replace(/\D/g, '').length < 6) {
      setError('Numéro de téléphone trop court.');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Adresse e-mail invalide.');
      return;
    }
    const label = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || phone.trim() || cleanEmail;
    onSave({
      label,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
      ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      ...(whatsapp ? { whatsappOptIn: true } : {}),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Client" description="Son téléphone suffit ; l’e-mail lui envoie son ticket.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Téléphone" error={error ?? undefined}>
          {(props) => <Input {...props} autoFocus type="tel" inputMode="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
        {match && (
          <p className="well flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[0.875rem]">
            <UserRoundCheck className="size-4 shrink-0 text-ink-2" strokeWidth={1.8} aria-hidden />
            <span>
              Client connu : <span className="font-[600]">{customerName(match)}</span>, {match.ordersCount} achat{match.ordersCount > 1 ? 's' : ''}
            </span>
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prénom">{(props) => <Input {...props} maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}</Field>
          <Field label="Nom">{(props) => <Input {...props} maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} />}</Field>
        </div>
        <Field label="E-mail (facultatif)">
          {(props) => <Input {...props} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
          <Switch checked={whatsapp} onChange={setWhatsapp} />
          <span className="flex flex-col">
            <span className="font-[600]">Nouveautés sur WhatsApp</span>
            <span className="text-[0.875rem] text-ink-2">Le client accepte de recevoir vos nouveautés ; il peut répondre STOP à tout moment.</span>
          </span>
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          {customer && (
            <Button
              variant="ghost"
              onClick={() => {
                onSave(null);
                onOpenChange(false);
              }}
            >
              Retirer le client
            </Button>
          )}
          <Button type="submit" variant="primary">
            Valider
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Remise du ticket, en pourcentage ou en montant. Un vendeur reste sous le plafond fixé
 * par l'administrateur (réglages de la caisse).
 */
export function DiscountDialog({
  open,
  onOpenChange,
  currency,
  base,
  discount,
  maxPercent,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  /** Montant sur lequel porte la remise (ticket hors remise). */
  base: number;
  discount: PosDiscountInput | null;
  /** Plafond du vendeur ; null pour un administrateur. */
  maxPercent: number | null;
  onSave: (discount: PosDiscountInput | null) => void;
}) {
  const [kind, setKind] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setKind(discount?.kind ?? 'PERCENT');
    setValue(discount ? (discount.kind === 'PERCENT' ? String(discount.value) : amountToInput(discount.value, currency)) : '');
    setReason(discount?.reason ?? '');
  }, [open, discount, currency]);

  const parsed = kind === 'PERCENT' ? (/^\d{1,3}$/.test(value.trim()) ? Number(value.trim()) : null) : parseAmount(value, currency);
  const input: PosDiscountInput | null = parsed && parsed > 0 ? { kind, value: parsed, ...(reason.trim() ? { reason: reason.trim() } : {}) } : null;
  const amount = input ? posDiscountAmount(base, input) : 0;
  const tooHigh = maxPercent !== null && amount > Math.floor((base * maxPercent) / 100);
  const invalid = value.trim() !== '' && (parsed === null || (kind === 'PERCENT' && parsed > 100));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remise"
      description={maxPercent === null ? 'Elle s’applique au ticket entier.' : maxPercent === 0 ? 'Une remise demande l’accord d’un administrateur.' : `Vous pouvez accorder ${maxPercent} % au plus.`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!input || tooHigh) return;
          onSave(input);
          onOpenChange(false);
        }}
        className="flex flex-col gap-5"
      >
        <Tabs
          label="Type de remise"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setValue('');
          }}
          items={[
            { value: 'PERCENT', label: 'Pourcentage' },
            { value: 'AMOUNT', label: 'Montant' },
          ]}
          className="self-start"
        />
        <Field
          label={kind === 'PERCENT' ? 'Pourcentage' : 'Montant'}
          error={invalid ? 'Valeur invalide.' : tooHigh ? `Au-delà de ${maxPercent} % : demandez à un administrateur.` : undefined}
          hint={amount > 0 ? `Remise de ${formatMoney(amount, currency)} sur ${formatMoney(base, currency)}.` : undefined}
        >
          {(props) => (
            <InputWithSuffix
              {...props}
              autoFocus
              inputMode={kind === 'PERCENT' ? 'numeric' : 'decimal'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              suffix={kind === 'PERCENT' ? '%' : currencyLabel(currency)}
            />
          )}
        </Field>
        <Field label="Motif (facultatif)" hint="Imprimé sur le ticket : « Fidélité », « Lot de 3 »…">
          {(props) => <Input {...props} maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          {discount && (
            <Button
              variant="ghost"
              onClick={() => {
                onSave(null);
                onOpenChange(false);
              }}
            >
              Retirer la remise
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={!input || tooHigh}>
            Appliquer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Article divers, hors catalogue (réparation, service, petite pièce), au prix saisi. */
export function CustomLineDialog({
  open,
  onOpenChange,
  currency,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  onAdd: (line: { title: string; unitPriceAmount: number; quantity: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (open) {
      setTitle('');
      setPrice('');
      setQuantity('1');
    }
  }, [open]);

  const amount = parseAmount(price, currency);
  const count = /^\d{1,3}$/.test(quantity.trim()) ? Number(quantity.trim()) : null;
  const ready = title.trim() !== '' && amount !== null && count !== null && count > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Article divers" description="Hors catalogue et sans stock : un service, une réparation, une petite pièce.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          onAdd({ title: title.trim(), unitPriceAmount: amount, quantity: count });
          onOpenChange(false);
        }}
        className="flex flex-col gap-5"
      >
        <Field label="Désignation">{(props) => <Input {...props} autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
          <Field label="Prix" error={price.trim() && amount === null ? 'Montant invalide.' : undefined}>
            {(props) => <InputWithSuffix {...props} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} suffix={currencyLabel(currency)} />}
          </Field>
          <Field label="Quantité">{(props) => <Input {...props} inputMode="numeric" className="tabular" value={quantity} onChange={(e) => setQuantity(e.target.value)} />}</Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={!ready}>
            Ajouter au ticket
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
