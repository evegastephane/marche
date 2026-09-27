'use client';

import { type InputHTMLAttributes, useActionState, useState } from 'react';
import { type CheckoutState, placeOrder } from '@/actions/checkout';
import { cn } from '@/lib/format';

const COUNTRIES = [
  ['SN', 'Sénégal'],
  ['CI', 'Côte d’Ivoire'],
  ['ML', 'Mali'],
  ['BF', 'Burkina Faso'],
  ['BJ', 'Bénin'],
  ['TG', 'Togo'],
  ['NE', 'Niger'],
  ['GN', 'Guinée'],
  ['CM', 'Cameroun'],
  ['GA', 'Gabon'],
  ['CG', 'Congo'],
  ['MA', 'Maroc'],
  ['FR', 'France'],
  ['BE', 'Belgique'],
] as const;

function Input({
  name,
  label,
  error,
  className,
  ...props
}: { name: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
      <span className="font-semibold">{label}</span>
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        className="min-h-12 rounded-lg border border-line bg-bg px-3.5 text-base text-fg outline-none focus:border-fg aria-invalid:border-red-700"
        {...props}
      />
      {error && <span className="font-semibold text-red-700">{error}</span>}
    </label>
  );
}

/** Commande sans compte : coordonnées et adresse de livraison ; paiement à la réception. */
export function CheckoutForm({ defaultCountry }: { defaultCountry: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  // Une clé par formulaire affiché : un double envoi ne crée qu'une commande.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-heading text-xl font-bold">Vos coordonnées</legend>
        <Input name="email" type="email" label="E-mail" autoComplete="email" required error={errors.email} />
        <Input name="phone" type="tel" label="Téléphone" autoComplete="tel" error={errors.phone} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 font-heading text-xl font-bold">Livraison</legend>
        <Input name="firstName" label="Prénom" autoComplete="given-name" required error={errors.firstName} />
        <Input name="lastName" label="Nom" autoComplete="family-name" required error={errors.lastName} />
        <Input name="line1" label="Adresse" autoComplete="address-line1" required error={errors.line1} className="sm:col-span-2" />
        <Input name="line2" label="Complément (quartier, repère…)" autoComplete="address-line2" className="sm:col-span-2" />
        <Input name="city" label="Ville" autoComplete="address-level2" required error={errors.city} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Pays</span>
          <select
            name="country"
            defaultValue={defaultCountry}
            autoComplete="country"
            className="min-h-12 rounded-lg border border-line bg-bg px-3 text-base text-fg outline-none focus:border-fg"
          >
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold">Note pour la boutique</span>
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            className="rounded-lg border border-line bg-bg px-3.5 py-3 text-base text-fg outline-none focus:border-fg"
          />
        </label>
      </fieldset>

      {state.message && (
        <p
          role="alert"
          className={cn('rounded-lg px-4 py-3 text-sm font-semibold', state.cartChanged ? 'bg-amber-100 text-amber-950' : 'bg-red-50 text-red-800')}
        >
          {state.message}{' '}
          {state.cartChanged && (
            <a href="/cart" className="underline">
              Revoir le panier
            </a>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-primary px-6 text-base font-semibold text-on-primary transition-opacity disabled:opacity-60"
      >
        {pending ? 'Envoi de la commande…' : 'Valider la commande'}
      </button>
      <p className="text-sm text-muted">Vous réglez à la réception ou selon les modalités indiquées par la boutique.</p>
    </form>
  );
}
