'use client';

import type { ProductOption, SpecialRequestType } from '@marche/contracts';
import { CheckCircle2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useId, useState, useTransition } from 'react';
import { submitSpecialRequest } from '@/actions/requests';
import { track } from '@/components/analytics';
import { cn } from '@/lib/format';
import { Sheet } from './sheet';

const field =
  'min-h-11 w-full rounded-[inherit] border border-current/25 bg-transparent px-3 text-base outline-none transition-colors focus-visible:border-current';

function Input({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 rounded-lg">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children(id)}
      {error && (
        <span role="alert" className="text-sm font-semibold">
          {error}
        </span>
      )}
    </div>
  );
}

/** Précision demandée à l'acheteur : une mesure (en cm), ou une information sur l'appareil à reprendre. */
export interface RequestDetailField {
  name: string;
  placeholder?: string;
  unit?: string;
  choices?: string[];
  numeric?: boolean;
}

const TITLES: Record<SpecialRequestType, string> = {
  CONFIGURATION: 'Commander sur demande',
  TRADE_IN: 'Reprise de votre ancien appareil',
  MADE_TO_MEASURE: 'Commander sur mesure',
};

/**
 * Demande à la boutique, qui répond prix et délai : une configuration absente du stock (sur demande),
 * un achat avec reprise de l'ancien appareil, ou une pièce sur mesure avec les mesures du client.
 * La configuration choisie sur la fiche est gardée, même absente du stock.
 */
export function SpecialRequestButton({
  productSlug,
  productTitle,
  options,
  selection,
  type = 'CONFIGURATION',
  details = [],
  intro,
  label = TITLES[type],
  className,
  sheetClassName,
}: {
  productSlug: string;
  productTitle: string;
  options: ProductOption[];
  selection: string[];
  type?: SpecialRequestType;
  /** Champs propres à la demande (mesures, appareil repris). */
  details?: RequestDetailField[];
  /** Phrase d'explication en tête du formulaire (délai de confection, texte de reprise…). */
  intro?: string;
  label?: string;
  className?: string;
  sheetClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const configuration = options
    .map((option, i) => (selection[i] ? { name: option.name, value: selection[i]! } : null))
    .filter((o): o is { name: string; value: string } => o !== null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = String(data.get('note') ?? '').trim();
    const filled = details
      .map((detail, i) => {
        const value = String(data.get(`detail-${i}`) ?? '').trim();
        return value ? { name: detail.name, value: detail.unit ? `${value} ${detail.unit}` : value } : null;
      })
      .filter((d): d is { name: string; value: string } => d !== null);
    if (type === 'MADE_TO_MEASURE' && filled.length < details.length) {
      setFormError('Indiquez toutes vos mesures : la boutique en a besoin pour couper la pièce.');
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await submitSpecialRequest({
        type,
        details: filled,
        productSlug,
        options: configuration,
        quantity: Number(data.get('quantity') ?? 1),
        firstName: String(data.get('firstName') ?? ''),
        lastName: String(data.get('lastName') ?? '') || undefined,
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        note: note || undefined,
      });
      if (result.ok) {
        setDone(true);
        setErrors({});
        track('special_request_sent', { productSlug, type });
      } else {
        setErrors(result.fields ?? {});
        setFormError(result.message);
      }
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setDone(false);
        }}
        title={done ? 'Demande envoyée' : TITLES[type]}
        className={sheetClassName}
      >
        {done ? (
          <div className="flex flex-col gap-3">
            <CheckCircle2 className="size-10" aria-hidden />
            <p className="text-base leading-relaxed">
              La boutique a bien reçu votre demande pour <strong>{productTitle}</strong>.{' '}
              {type === 'TRADE_IN'
                ? 'Elle estime votre ancien appareil et vous répond avec le prix à payer, reprise déduite.'
                : 'Elle vous répond avec un prix et un délai, par e-mail ou par téléphone.'}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{productTitle}</p>
              {configuration.length > 0 && (
                <p className="text-sm opacity-80">{configuration.map((o) => `${o.name} : ${o.value}`).join(' · ')}</p>
              )}
            </div>
            {intro && <p className="text-sm leading-relaxed opacity-85">{intro}</p>}
            {details.length > 0 && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-semibold">
                  {type === 'MADE_TO_MEASURE' ? 'Vos mesures (en cm)' : 'Votre ancien appareil'}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {details.map((detail, i) => (
                    <Input key={detail.name} label={detail.name}>
                      {(id) =>
                        detail.choices ? (
                          <select id={id} name={`detail-${i}`} className={cn(field, 'appearance-none')} defaultValue="">
                            <option value="" disabled>
                              Choisir…
                            </option>
                            {detail.choices.map((choice) => (
                              <option key={choice}>{choice}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={id}
                            name={`detail-${i}`}
                            inputMode={detail.numeric ? 'decimal' : undefined}
                            maxLength={70}
                            placeholder={detail.placeholder}
                            className={cn(field, detail.numeric && 'tabular')}
                          />
                        )
                      }
                    </Input>
                  ))}
                </div>
              </fieldset>
            )}
            <Input label="Précisions" error={errors.note}>
              {(id) => (
                <textarea
                  id={id}
                  name="note"
                  rows={2}
                  maxLength={500}
                  placeholder={
                    type === 'TRADE_IN'
                      ? 'Rayures, batterie, accessoires fournis…'
                      : type === 'MADE_TO_MEASURE'
                        ? 'Tissu, longueur souhaitée, date de l’événement…'
                        : 'Une autre couleur, 1 To, un délai souhaité…'
                  }
                  className={cn(field, 'py-2.5')}
                />
              )}
            </Input>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Prénom" error={errors.firstName}>
                {(id) => <input id={id} name="firstName" autoComplete="given-name" required maxLength={80} className={field} />}
              </Input>
              <Input label="Nom (facultatif)" error={errors.lastName}>
                {(id) => <input id={id} name="lastName" autoComplete="family-name" maxLength={80} className={field} />}
              </Input>
              <Input label="Téléphone" error={errors.phone}>
                {(id) => <input id={id} name="phone" type="tel" autoComplete="tel" required maxLength={30} className={field} />}
              </Input>
              <Input label="E-mail" error={errors.email}>
                {(id) => <input id={id} name="email" type="email" autoComplete="email" required className={field} />}
              </Input>
              <Input label="Quantité" error={errors.quantity}>
                {(id) => (
                  <input id={id} name="quantity" type="number" inputMode="numeric" min={1} max={20} defaultValue={1} className={cn(field, 'tabular')} />
                )}
              </Input>
            </div>
            {formError && (
              <p role="alert" className="text-sm font-semibold">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 rounded-[inherit] bg-primary px-6 font-semibold text-on-primary transition-opacity disabled:opacity-60"
            >
              {pending ? 'Envoi…' : 'Envoyer ma demande'}
            </button>
            <p className="text-xs opacity-75">
              {type === 'TRADE_IN'
                ? 'Aucun paiement maintenant : l’estimation définitive se fait en boutique, appareil en main.'
                : 'Aucun paiement maintenant : vous confirmez après avoir reçu le prix et le délai.'}
            </p>
          </form>
        )}
      </Sheet>
    </>
  );
}
