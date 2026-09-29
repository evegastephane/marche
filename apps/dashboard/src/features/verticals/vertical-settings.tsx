import {
  type ConditionSetting,
  DEFAULT_MEASUREMENTS,
  DEFAULT_VERTICAL_SETTINGS,
  type StoreDto,
  type VerticalSettings,
} from '@marche/contracts';
import { Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { TagInput } from '@/features/products/form/tag-input';
import { Card, CardHeader } from '@/shared/ui/card';
import { Field, Input, InputWithSuffix, Textarea } from '@/shared/ui/field';
import { EASE_OUT } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';

/** Réglages de service propres au type de boutique, complétés par les valeurs de départ. */
export type VerticalDraft = Required<Omit<VerticalSettings, 'sizeGuides'>>;

export function verticalDraftOf(store: StoreDto): VerticalDraft {
  const own = store.verticalSettings;
  return {
    sizeExchange: own.sizeExchange ?? DEFAULT_VERTICAL_SETTINGS.sizeExchange,
    madeToMeasure: own.madeToMeasure ?? DEFAULT_VERTICAL_SETTINGS.madeToMeasure,
    departments: own.departments ?? DEFAULT_VERTICAL_SETTINGS.departments,
    warranty: own.warranty ?? DEFAULT_VERTICAL_SETTINGS.warranty,
    conditions: own.conditions ?? DEFAULT_VERTICAL_SETTINGS.conditions,
    tradeIn: own.tradeIn ?? DEFAULT_VERTICAL_SETTINGS.tradeIn,
    serialNumbers: own.serialNumbers ?? DEFAULT_VERTICAL_SETTINGS.serialNumbers,
    returns: own.returns ?? DEFAULT_VERTICAL_SETTINGS.returns,
  };
}

const DEFAULT_CONDITION_NAMES = new Set(
  DEFAULT_VERTICAL_SETTINGS.conditions.map((c) => c.value),
);

/** Nombre entier saisi dans un champ, ou 0 (la validation du schéma dit ce qui ne va pas). */
const int = (value: string) =>
  Number.parseInt(value.replace(/\D/g, '') || '0', 10);

/** Interrupteur d'un service : toute la ligne est cliquable ; le détail s'ouvre quand il est allumé. */
function ServiceToggle({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
        <Switch checked={checked} onChange={onChange} />
        <span className="flex flex-col">
          <span className="font-[600]">{title}</span>
          <span className="text-[0.875rem] text-ink-2">{description}</span>
        </span>
      </label>
      <AnimatePresence initial={false}>
        {checked && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SectionProps {
  draft: VerticalDraft;
  onChange: (next: VerticalDraft) => void;
  errors: Record<string, string>;
}

/** Mode : échange de taille, sur mesure, rayons. */
export function FashionServices({ draft, onChange, errors }: SectionProps) {
  const set = <K extends keyof VerticalDraft>(
    key: K,
    patch: Partial<VerticalDraft[K]>,
  ) => onChange({ ...draft, [key]: { ...draft[key], ...patch } });
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <Card>
        <CardHeader title="Échange de taille" />
        <div className="px-5 pb-6">
          <ServiceToggle
            title="Proposer l’échange"
            description="Affiché sur les fiches et au panier : le client sait qu’il peut changer de taille."
            checked={draft.sizeExchange.enabled}
            onChange={(enabled) => set('sizeExchange', { enabled })}
          >
            <Field
              label="Délai pour échanger"
              error={errors['sizeExchange.days']}
            >
              {(props) => (
                <InputWithSuffix
                  {...props}
                  suffix="jours"
                  inputMode="numeric"
                  className="tabular"
                  value={String(draft.sizeExchange.days)}
                  onChange={(e) =>
                    set('sizeExchange', { days: int(e.target.value) })
                  }
                />
              )}
            </Field>
            <Field
              label="Conditions"
              hint="Une phrase courte, affichée telle quelle."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  maxLength={400}
                  value={draft.sizeExchange.conditions}
                  onChange={(e) =>
                    set('sizeExchange', { conditions: e.target.value })
                  }
                />
              )}
            </Field>
          </ServiceToggle>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sur mesure" />
        <div className="px-5 pb-6">
          <ServiceToggle
            title="Accepter les commandes sur mesure"
            description="Un bouton « Commander sur mesure » sur les fiches ; le client envoie ses mesures, la demande arrive dans Demandes."
            checked={draft.madeToMeasure.enabled}
            onChange={(enabled) => set('madeToMeasure', { enabled })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Délai de confection"
                error={errors['madeToMeasure.leadTimeDays']}
              >
                {(props) => (
                  <InputWithSuffix
                    {...props}
                    suffix="jours"
                    inputMode="numeric"
                    className="tabular"
                    value={String(draft.madeToMeasure.leadTimeDays)}
                    onChange={(e) =>
                      set('madeToMeasure', {
                        leadTimeDays: int(e.target.value),
                      })
                    }
                  />
                )}
              </Field>
              <Field
                label="Acompte demandé"
                error={errors['madeToMeasure.depositPercent']}
              >
                {(props) => (
                  <InputWithSuffix
                    {...props}
                    suffix="%"
                    inputMode="numeric"
                    className="tabular"
                    value={String(draft.madeToMeasure.depositPercent)}
                    onChange={(e) =>
                      set('madeToMeasure', {
                        depositPercent: int(e.target.value),
                      })
                    }
                  />
                )}
              </Field>
            </div>
            <Field
              label="Mesures demandées au client"
              hint="En centimètres. Tapez une mesure puis Entrée."
              error={errors['madeToMeasure.measurements']}
            >
              {(props) => (
                <TagInput
                  id={props.id}
                  describedBy={props['aria-describedby']}
                  invalid={Boolean(errors['madeToMeasure.measurements'])}
                  values={draft.madeToMeasure.measurements}
                  suggestions={DEFAULT_MEASUREMENTS}
                  onChange={(measurements) =>
                    set('madeToMeasure', { measurements })
                  }
                  placeholder="Tour de cou…"
                />
              )}
            </Field>
          </ServiceToggle>
        </div>
      </Card>

      <Card>
        <CardHeader title="Rayons" />
        <div className="px-5 pb-6">
          <ServiceToggle
            title="Ranger le site par rayon"
            description="Femme, Homme, Enfant dans le menu du site, d’après le « Rayon » de chaque produit. Un rayon sans produit n’apparaît pas."
            checked={draft.departments.enabled}
            onChange={(enabled) => set('departments', { enabled })}
          />
        </div>
      </Card>
    </div>
  );
}

/** Tech : garantie et états, reprise, IMEI, retours et SAV. */
export function TechServices({ draft, onChange, errors }: SectionProps) {
  const set = <K extends Exclude<keyof VerticalDraft, 'conditions'>>(
    key: K,
    patch: Partial<VerticalDraft[K]>,
  ) => onChange({ ...draft, [key]: { ...draft[key], ...patch } });
  const setCondition = (index: number, patch: Partial<ConditionSetting>) =>
    onChange({
      ...draft,
      conditions: draft.conditions.map((c, i) =>
        i === index ? { ...c, ...patch } : c,
      ),
    });
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <Card>
        <CardHeader title="Garantie et états" />
        <div className="flex flex-col gap-5 px-5 pb-6">
          <Field
            label="Garantie par défaut"
            hint="Préremplie sur chaque nouvel appareil ; modifiable produit par produit."
            error={errors['warranty.defaultMonths']}
          >
            {(props) => (
              <InputWithSuffix
                {...props}
                suffix="mois"
                inputMode="numeric"
                className="tabular"
                value={String(draft.warranty.defaultMonths)}
                onChange={(e) =>
                  set('warranty', { defaultMonths: int(e.target.value) })
                }
              />
            )}
          </Field>
          <Field
            label="Conditions de garantie"
            hint="Affichées sur les fiches des appareils."
          >
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                maxLength={400}
                value={draft.warranty.terms}
                placeholder="Pièces et main-d’œuvre, hors casse et oxydation."
                onChange={(e) => set('warranty', { terms: e.target.value })}
              />
            )}
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[0.8125rem] font-[600] text-ink">
              États proposés
            </legend>
            <p className="text-[0.8125rem] text-ink-2">
              Cochez ceux que vous vendez ; leur explication s’affiche sous le
              choix de l’état, sur le site.
            </p>
            {draft.conditions.map((condition, index) => (
              <div
                key={index}
                className="well flex flex-col gap-2 rounded-xl px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={condition.enabled}
                    onChange={(enabled) => setCondition(index, { enabled })}
                  />
                  <Input
                    aria-label={`Nom de l’état ${index + 1}`}
                    value={condition.value}
                    maxLength={40}
                    onChange={(e) =>
                      setCondition(index, { value: e.target.value })
                    }
                    className="font-[600]"
                  />
                  {!DEFAULT_CONDITION_NAMES.has(condition.value) && (
                    <button
                      type="button"
                      aria-label={`Retirer l’état ${condition.value || index + 1}`}
                      onClick={() =>
                        onChange({
                          ...draft,
                          conditions: draft.conditions.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
                <Textarea
                  aria-label={`Explication de l’état ${condition.value || index + 1}`}
                  rows={2}
                  maxLength={200}
                  value={condition.description}
                  onChange={(e) =>
                    setCondition(index, { description: e.target.value })
                  }
                />
              </div>
            ))}
            {errors.conditions && (
              <p className="text-[0.8125rem] text-danger">
                {errors.conditions}
              </p>
            )}
            {draft.conditions.length < 8 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    conditions: [
                      ...draft.conditions,
                      { value: '', description: '', enabled: true },
                    ],
                  })
                }
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-2 text-[0.875rem] font-[600] text-ink-2 hover:text-ink"
              >
                <Plus className="size-4" strokeWidth={2} /> Ajouter un état
              </button>
            )}
          </fieldset>
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Reprise d’ancien appareil" />
          <div className="px-5 pb-6">
            <ServiceToggle
              title="Proposer la reprise"
              description="Sur les fiches des appareils, le client décrit son ancien téléphone ; la demande arrive dans Demandes, vous faites votre offre."
              checked={draft.tradeIn.enabled}
              onChange={(enabled) => set('tradeIn', { enabled })}
            >
              <Field label="Texte affiché sur le site">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    maxLength={300}
                    value={draft.tradeIn.text}
                    onChange={(e) => set('tradeIn', { text: e.target.value })}
                  />
                )}
              </Field>
            </ServiceToggle>
          </div>
        </Card>

        <Card>
          <CardHeader title="IMEI et numéros de série" />
          <div className="px-5 pb-6">
            <ServiceToggle
              title="Noter l’IMEI à l’expédition"
              description="À l’expédition, vous saisissez l’IMEI ou le numéro de série de chaque appareil ; il figure sur la commande et dans l’e-mail du client."
              checked={draft.serialNumbers.enabled}
              onChange={(enabled) => set('serialNumbers', { enabled })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Retours et SAV" />
          <div className="px-5 pb-6">
            <ServiceToggle
              title="Afficher vos conditions de retour"
              description="Sur les fiches et au panier : délai, conditions et contact du service après-vente."
              checked={draft.returns.enabled}
              onChange={(enabled) => set('returns', { enabled })}
            >
              <Field label="Délai de retour" error={errors['returns.days']}>
                {(props) => (
                  <InputWithSuffix
                    {...props}
                    suffix="jours"
                    inputMode="numeric"
                    className="tabular"
                    value={String(draft.returns.days)}
                    onChange={(e) =>
                      set('returns', { days: int(e.target.value) })
                    }
                  />
                )}
              </Field>
              <Field label="Conditions">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    maxLength={400}
                    value={draft.returns.conditions}
                    onChange={(e) =>
                      set('returns', { conditions: e.target.value })
                    }
                  />
                )}
              </Field>
              <Field label="Contact SAV" hint="Téléphone, WhatsApp ou adresse.">
                {(props) => (
                  <Input
                    {...props}
                    maxLength={120}
                    value={draft.returns.afterSalesContact}
                    placeholder="+221 77 000 00 00 (WhatsApp)"
                    onChange={(e) =>
                      set('returns', { afterSalesContact: e.target.value })
                    }
                  />
                )}
              </Field>
            </ServiceToggle>
          </div>
        </Card>
      </div>
    </div>
  );
}
