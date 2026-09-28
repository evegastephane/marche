import { type Address, addressSchema, type CreateDraftOrderInput, customerInputSchema, MAX_LINE_QUANTITY } from '@marche/contracts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Minus, PackagePlus, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateOrder } from '@/features/orders/api';
import { type PickedLine, VariantPicker } from '@/features/orders/variant-picker';
import { COUNTRIES } from '@/features/onboarding/countries';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError, errorMessage } from '@/shared/api/client';
import { currencyLabel, formatAmount, formatMoney } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { EASE_OUT, glide, riseIn } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';

export const Route = createFileRoute('/_app/orders/new')({ component: NouvelleCommande });

interface Line extends PickedLine {
  quantity: number;
}

const emptyAddress = (country: string): Record<keyof Address, string> => ({
  firstName: '',
  lastName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  region: '',
  country,
});

/**
 * Commande saisie à la main (vente en boutique, par téléphone, sur WhatsApp) :
 * le client, les articles, l'adresse de livraison si besoin. On l'enregistre en brouillon,
 * ou on la passe tout de suite, ce qui réserve le stock.
 */
function NouvelleCommande() {
  const store = useCurrentStore();
  const create = useCreateOrder();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [delivery, setDelivery] = useState(false);
  const [address, setAddress] = useState<Record<keyof Address, string> | null>(null);
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<'draft' | 'place' | null>(null);

  if (!store.data) return <Skeleton className="h-96" />;
  const currency = store.data.currency;
  const addr = address ?? emptyAddress(store.data.country);
  const subtotal = lines.reduce((sum, l) => sum + l.priceAmount * l.quantity, 0);

  const setQuantity = (variantId: string, quantity: number) =>
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(Math.max(quantity, 1), MAX_LINE_QUANTITY) } : l)),
    );

  const addLine = (picked: PickedLine) =>
    setLines((prev) =>
      prev.some((l) => l.variantId === picked.variantId)
        ? prev.map((l) => (l.variantId === picked.variantId ? { ...l, quantity: Math.min(l.quantity + 1, MAX_LINE_QUANTITY) } : l))
        : [...prev, { ...picked, quantity: 1 }],
    );

  const build = (): CreateDraftOrderInput | null => {
    const errs: Record<string, string> = {};
    let customer: CreateDraftOrderInput['customer'] = null;
    if (email.trim() || firstName.trim() || lastName.trim() || phone.trim()) {
      const parsed = customerInputSchema.safeParse({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (parsed.success) customer = parsed.data;
      else errs.email = email.trim() ? 'Adresse e-mail invalide.' : 'L’e-mail du client est nécessaire pour créer sa fiche.';
    }
    if (lines.length === 0) errs.lines = 'Ajoutez au moins un article.';
    let shippingAddress: Address | null = null;
    if (delivery) {
      const parsed = addressSchema.safeParse(
        Object.fromEntries(Object.entries(addr).map(([k, v]) => [k, v.trim() || undefined])),
      );
      if (parsed.success) shippingAddress = parsed.data;
      else for (const issue of parsed.error.issues) errs[`address.${issue.path.join('.')}`] = 'À compléter.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;
    return {
      customer,
      lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      shippingAddress,
      note: note.trim() || null,
    };
  };

  const submit = (place: boolean) => {
    const input = build();
    if (!input) {
      toast.error('Quelques champs sont à compléter.');
      return;
    }
    setSubmitting(place ? 'place' : 'draft');
    create.mutate(
      { input, place },
      {
        onSuccess: (order) => {
          toast(place ? 'Commande passée, stock réservé' : 'Brouillon enregistré');
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id } });
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK'
              ? 'Stock insuffisant pour au moins un article : la commande reste en brouillon.'
              : errorMessage(error),
          );
        },
        onSettled: () => setSubmitting(null),
      },
    );
  };

  const addressField = (key: keyof Address, label: string, props: { autoComplete?: string; maxLength?: number } = {}) => (
    <Field label={label} error={errors[`address.${key}`]}>
      {(field) => (
        <Input
          {...field}
          {...props}
          value={addr[key]}
          onChange={(e) => setAddress({ ...addr, [key]: e.target.value })}
        />
      )}
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link
          to="/orders"
          className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Commandes
        </Link>
      </motion.div>
      <PageHeader
        title="Nouvelle commande"
        subtitle="Une vente en boutique, au téléphone ou sur WhatsApp : elle rejoint vos commandes et votre stock."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="overflow-hidden">
            <CardHeader
              title="Articles"
              count={lines.reduce((sum, l) => sum + l.quantity, 0)}
              actions={
                <Button size="sm" variant="secondary" icon={<Plus strokeWidth={1.8} />} onClick={() => setPicking(true)}>
                  Ajouter
                </Button>
              }
            />
            {lines.length === 0 ? (
              <EmptyState icon={PackagePlus} title="Aucun article" className="py-8">
                {errors.lines ? <span className="text-danger-ink">{errors.lines}</span> : 'Ajoutez les articles vendus.'}
              </EmptyState>
            ) : (
              <ul className="border-t border-line">
                <AnimatePresence initial={false}>
                  {lines.map((line) => {
                    const over = line.available !== null && line.quantity > line.available;
                    return (
                      <motion.li
                        key={line.variantId}
                        layout="position"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24, transition: { duration: 0.2, ease: EASE_OUT } }}
                        transition={glide}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-[600]">{line.productTitle}</span>
                          <span className="block truncate text-[0.8125rem] text-ink-2">
                            {line.variantTitle !== 'Par défaut' ? `${line.variantTitle} · ` : ''}
                            {line.sku}
                            {over && <span className="text-danger-ink"> · {line.available} en stock</span>}
                          </span>
                        </span>
                        <span className="well flex items-center rounded-[0.7rem] p-0.5 max-sm:order-3">
                          <button
                            type="button"
                            aria-label="Retirer un"
                            onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink disabled:opacity-40"
                          >
                            <Minus className="size-4" />
                          </button>
                          <input
                            aria-label={`Quantité ${line.productTitle}`}
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(e) => setQuantity(line.variantId, Number(e.target.value.replace(/\D/g, '')) || 1)}
                            className="tabular w-10 bg-transparent text-center font-[600] outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Ajouter un"
                            onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink"
                          >
                            <Plus className="size-4" />
                          </button>
                        </span>
                        <span className="tabular text-right font-[600] max-sm:order-4">
                          {formatMoney(line.priceAmount * line.quantity, currency)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Retirer ${line.productTitle}`}
                          onClick={() => setLines((prev) => prev.filter((l) => l.variantId !== line.variantId))}
                          className="inline-flex size-9 items-center justify-center justify-self-end rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink max-sm:order-2"
                        >
                          <X className="size-4" strokeWidth={1.8} />
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Client" />
            <div className="grid gap-5 px-5 pb-6 sm:grid-cols-2">
              <Field label="E-mail" hint="Facultatif pour une vente au comptoir." error={errors.email} className="sm:col-span-2">
                {(props) => (
                  <Input {...props} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
                )}
              </Field>
              <Field label="Prénom">
                {(props) => <Input {...props} value={firstName} maxLength={80} onChange={(e) => setFirstName(e.target.value)} />}
              </Field>
              <Field label="Nom">
                {(props) => <Input {...props} value={lastName} maxLength={80} onChange={(e) => setLastName(e.target.value)} />}
              </Field>
              <Field label="Téléphone" className="sm:col-span-2">
                {(props) => (
                  <Input {...props} type="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Livraison" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
                <Switch checked={delivery} onChange={setDelivery} />
                <span className="flex flex-col">
                  <span className="font-[600]">Livrer à une adresse</span>
                  <span className="text-[0.875rem] text-ink-2">Sinon, le client repart avec ses articles.</span>
                </span>
              </label>
              <AnimatePresence initial={false}>
                {delivery && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      {addressField('firstName', 'Prénom', { maxLength: 80 })}
                      {addressField('lastName', 'Nom', { maxLength: 80 })}
                      <div className="sm:col-span-2">{addressField('line1', 'Adresse', { maxLength: 200 })}</div>
                      <div className="sm:col-span-2">{addressField('line2', 'Complément (facultatif)', { maxLength: 200 })}</div>
                      {addressField('city', 'Ville', { maxLength: 100 })}
                      {addressField('region', 'Quartier ou région (facultatif)', { maxLength: 100 })}
                      {addressField('phone', 'Téléphone du destinataire (facultatif)', { maxLength: 30 })}
                      <Field label="Pays">
                        {(props) => (
                          <Select {...props} value={addr.country} onChange={(e) => setAddress({ ...addr, country: e.target.value })}>
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-9">
          <Card className="flex flex-col gap-4 p-5">
            <div className="display-window flex items-end justify-between gap-4 rounded-xl px-4 py-3.5">
              <span className="legend pb-1 text-display-dim">Sous-total</span>
              <span className="flex items-baseline gap-2">
                <AnimatedNumber
                  value={subtotal}
                  format={(n) => formatAmount(Math.round(n), currency)}
                  className="readout text-[2rem]"
                />
                <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
              </span>
            </div>
            <p className="text-[0.8125rem] text-ink-2">Les frais de livraison s’ajoutent au passage, selon vos paramètres.</p>
            <Field label="Note interne (facultative)">
              {(props) => (
                <Textarea {...props} className="min-h-20" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
              )}
            </Field>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={submitting === 'place'}
              disabled={submitting !== null}
              onClick={() => submit(true)}
            >
              Passer la commande
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              loading={submitting === 'draft'}
              disabled={submitting !== null}
              onClick={() => submit(false)}
            >
              Enregistrer en brouillon
            </Button>
            <p className="text-[0.8125rem] text-ink-2">
              Passer la commande réserve le stock tout de suite. Un brouillon ne réserve rien.
            </p>
          </Card>
        </aside>
      </div>

      <VariantPicker open={picking} onOpenChange={setPicking} currency={currency} onPick={addLine} />
    </div>
  );
}
