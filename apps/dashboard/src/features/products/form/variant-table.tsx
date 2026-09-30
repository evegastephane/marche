import { combinationKey, generateCombinations, type VariantOptions } from '@marche/contracts';
import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { plural } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Field, Input, InputWithSuffix } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import {
  activeAxes,
  type Attributes,
  colorAxis,
  type DraftErrors,
  parseSerials,
  type ProductDraft,
  swatchOf,
  type VariantDraft,
  variantLabel,
} from '../model/product-draft';
import { Swatch } from './swatch';
import { UnitsEditor } from './units-editor';

interface TableProps {
  draft: ProductDraft;
  attributes: Attributes;
  tracksUnits: boolean;
  errors: DraftErrors;
  /** SKU déjà pris par un autre produit (vérifiés pendant la saisie). */
  takenSkus: ReadonlySet<string>;
  unit: string;
  onChange: (key: string, patch: Partial<VariantDraft>) => void;
  onToggleCombination: (options: VariantOptions, offered: boolean) => void;
}

const GRID = 'sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_6.75rem_2.25rem]';

function skuError(errors: DraftErrors, index: number, sku: string, taken: ReadonlySet<string>): string | undefined {
  return errors[`variants.${index}.sku`] ?? (taken.has(sku.trim().toUpperCase()) ? 'Déjà pris par un autre produit.' : undefined);
}

/** Valeurs d'une variante en pastilles (la couleur avec sa teinte). */
function OptionsLabel({ variant, attributes }: { variant: VariantDraft; attributes: Attributes }) {
  const color = colorAxis(attributes);
  const order = activeAxesOrder(attributes, variant.options);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {order.map(([slug, value]) => (
        <span key={slug} className="well inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.8125rem] font-[560]">
          {color?.slug === slug && <Swatch hex={swatchOf(color, value)} className="size-3" />}
          {value}
        </span>
      ))}
    </span>
  );
}

function activeAxesOrder(attributes: Attributes, options: VariantOptions): [string, string][] {
  const slugs = attributes.filter((a) => a.isVariantAxis).map((a) => a.slug);
  return [
    ...slugs.filter((slug) => options[slug]).map((slug): [string, string] => [slug, options[slug] as string]),
    ...Object.entries(options).filter(([slug]) => !slugs.includes(slug)),
  ];
}

/** Même prix pour toutes les variantes, en un geste. */
function FillAll({ draft, unit, onChange }: Pick<TableProps, 'draft' | 'unit' | 'onChange'>) {
  const same = (field: 'price' | 'cost') => {
    const values = new Set(draft.variants.map((v) => v[field]));
    return values.size === 1 ? (draft.variants[0]?.[field] ?? '') : '';
  };
  return (
    <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
      {(['price', 'cost'] as const).map((field) => (
        <Field key={field} label={field === 'price' ? 'Prix de toutes' : 'Prix d’achat de toutes'}>
          {(props) => (
            <InputWithSuffix
              {...props}
              suffix={unit}
              inputMode="decimal"
              value={same(field)}
              placeholder={same(field) ? undefined : 'Variable'}
              onChange={(event) => {
                for (const variant of draft.variants) onChange(variant.key, { [field]: event.target.value });
              }}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

export function VariantTable(props: TableProps) {
  const { draft, attributes, tracksUnits, errors, takenSkus, unit, onChange, onToggleCombination } = props;
  const [open, setOpen] = useState<string | null>(null);
  const axes = activeAxes(draft, attributes);
  const excluded = new Set(draft.excluded);
  const removed = axes.length > 0 ? generateCombinations(axes).filter((options) => excluded.has(combinationKey(options))) : [];
  const removable = draft.variants.length > 1;
  const isEdit = draft.variants.some((variant) => variant.id);

  if (draft.variants.length === 0 && removed.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <FillAll draft={draft} unit={unit} onChange={onChange} />
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="heading text-[0.9375rem]">{plural(draft.variants.length, 'variante', 'variantes')}</p>
          {isEdit && <p className="text-[0.8125rem] text-ink-2">Retirer une combinaison archive sa variante.</p>}
        </div>
        <div aria-hidden className={cn('legend hidden gap-3 px-3.5 sm:grid', GRID)}>
          <span>Variante</span>
          <span>SKU</span>
          <span>Prix</span>
          <span>Achat</span>
          <span>{tracksUnits ? 'IMEI' : 'Stock'}</span>
          <span />
        </div>
        <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
          <AnimatePresence initial={false}>
            {draft.variants.map((variant, i) => {
              const label = variantLabel(variant, attributes);
              const unitsOpen = open === variant.key;
              const serialCount = parseSerials(variant.serials).units.length;
              return (
                <motion.li
                  key={variant.key}
                  layout="position"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={glide}
                  className="flex flex-col"
                >
                  <div className={cn('grid gap-3 px-3.5 py-3 sm:items-start', GRID)}>
                    <div className="flex items-start justify-between gap-2 sm:pt-2">
                      <OptionsLabel variant={variant} attributes={attributes} />
                      {removable && (
                        <ExcludeButton label={label} onClick={() => onToggleCombination(variant.options, false)} className="sm:hidden" />
                      )}
                    </div>
                    <Cell label="SKU" error={skuError(errors, i, variant.sku, takenSkus)}>
                      <Input
                        aria-label={`SKU ${label}`}
                        aria-invalid={skuError(errors, i, variant.sku, takenSkus) ? true : undefined}
                        className="tabular h-9 text-[0.8125rem] uppercase"
                        value={variant.sku}
                        spellCheck={false}
                        onChange={(event) => onChange(variant.key, { sku: event.target.value.toUpperCase(), skuTouched: true })}
                      />
                    </Cell>
                    <Cell label="Prix" error={errors[`variants.${i}.price`]}>
                      <InputWithSuffix
                        aria-label={`Prix ${label}`}
                        suffix={unit}
                        inputMode="decimal"
                        className="h-9 pr-14"
                        value={variant.price}
                        placeholder="0"
                        onChange={(event) => onChange(variant.key, { price: event.target.value })}
                      />
                    </Cell>
                    <Cell label="Prix d’achat" error={errors[`variants.${i}.cost`]}>
                      <InputWithSuffix
                        aria-label={`Prix d’achat ${label}`}
                        suffix={unit}
                        inputMode="decimal"
                        className="h-9 pr-14"
                        value={variant.cost}
                        onChange={(event) => onChange(variant.key, { cost: event.target.value })}
                      />
                    </Cell>
                    {variant.id ? (
                      <Cell label="Disponible">
                        <span className="tabular flex h-9 items-center font-[600] text-ink">{variant.available ?? 0}</span>
                      </Cell>
                    ) : tracksUnits ? (
                      <Cell label="IMEI" error={errors[`variants.${i}.serials`] ? 'À corriger' : undefined}>
                        <button
                          type="button"
                          aria-expanded={unitsOpen}
                          onClick={() => setOpen(unitsOpen ? null : variant.key)}
                          className={cn(
                            'inline-flex h-9 items-center justify-between gap-1.5 rounded-[0.7rem] px-3 text-[0.8125rem] font-[600] transition-colors',
                            serialCount === 0 ? 'text-accent-ink shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'well text-ink',
                          )}
                        >
                          <span className="tabular">{serialCount === 0 ? 'Saisir' : serialCount}</span>
                          <ChevronDown className={cn('size-3.5 transition-transform', unitsOpen && 'rotate-180')} strokeWidth={2} aria-hidden />
                        </button>
                      </Cell>
                    ) : (
                      <Cell label="Stock initial" error={errors[`variants.${i}.quantity`]}>
                        <Input
                          aria-label={`Stock ${label}`}
                          className="tabular h-9"
                          inputMode="numeric"
                          value={variant.quantity}
                          placeholder="0"
                          onChange={(event) => onChange(variant.key, { quantity: event.target.value.replace(/\D/g, '') })}
                        />
                      </Cell>
                    )}
                    <span className="hidden sm:flex sm:pt-0.5">
                      {removable && <ExcludeButton label={label} onClick={() => onToggleCombination(variant.options, false)} />}
                    </span>
                  </div>
                  <AnimatePresence initial={false}>
                    {tracksUnits && !variant.id && (unitsOpen || errors[`variants.${i}.serials`]) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={glide}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-4">
                          <UnitsEditor
                            label={label}
                            value={variant.serials}
                            error={errors[`variants.${i}.serials`]}
                            onChange={(serials) => onChange(variant.key, { serials })}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {errors.variants && (
          <p data-field-error className="text-[0.8125rem] font-[560] text-danger-ink">
            {errors.variants}
          </p>
        )}
      </div>
      {removed.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-[600]">Combinaisons non proposées</span>
          <div className="flex flex-wrap gap-1.5">
            {removed.map((options) => (
              <button
                key={combinationKey(options)}
                type="button"
                onClick={() => onToggleCombination(options, true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-[560] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:bg-surface-2 hover:text-ink max-md:h-10"
              >
                <RotateCcw className="size-3.5" strokeWidth={1.8} aria-hidden />
                {variantLabel({ options }, attributes)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Produit sans axe : une seule variante, ses champs en clair. */
export function SingleVariant({
  variant,
  tracksUnits,
  errors,
  takenSkus,
  unit,
  onChange,
}: {
  variant: VariantDraft;
  tracksUnits: boolean;
  errors: DraftErrors;
  takenSkus: ReadonlySet<string>;
  unit: string;
  onChange: (key: string, patch: Partial<VariantDraft>) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Prix" error={errors['variants.0.price']}>
        {(props) => (
          <InputWithSuffix
            {...props}
            suffix={unit}
            inputMode="decimal"
            value={variant.price}
            placeholder="0"
            onChange={(event) => onChange(variant.key, { price: event.target.value })}
          />
        )}
      </Field>
      <Field label="Prix avant remise" hint="Facultatif : affiché barré sur le site." error={errors['variants.0.compareAt']}>
        {(props) => (
          <InputWithSuffix
            {...props}
            suffix={unit}
            inputMode="decimal"
            value={variant.compareAt}
            onChange={(event) => onChange(variant.key, { compareAt: event.target.value })}
          />
        )}
      </Field>
      <Field label="Prix d’achat" hint="Facultatif : pour suivre votre marge." error={errors['variants.0.cost']}>
        {(props) => (
          <InputWithSuffix
            {...props}
            suffix={unit}
            inputMode="decimal"
            value={variant.cost}
            onChange={(event) => onChange(variant.key, { cost: event.target.value })}
          />
        )}
      </Field>
      <Field label="SKU" hint="Proposé depuis la référence ; modifiable." error={skuError(errors, 0, variant.sku, takenSkus)}>
        {(props) => (
          <Input
            {...props}
            className="tabular uppercase"
            value={variant.sku}
            spellCheck={false}
            onChange={(event) => onChange(variant.key, { sku: event.target.value.toUpperCase(), skuTouched: true })}
          />
        )}
      </Field>
      {variant.id ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-[600]">Stock disponible</span>
          <span className="display-window flex h-10 items-center justify-end rounded-[0.7rem] px-3.5 max-md:h-11">
            <AnimatedNumber value={variant.available ?? 0} className="readout text-[1.5rem]" />
          </span>
        </div>
      ) : tracksUnits ? (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[0.8125rem] font-[600]">IMEI ou numéros de série</span>
          <UnitsEditor
            label="produit"
            value={variant.serials}
            error={errors['variants.0.serials']}
            onChange={(serials) => onChange(variant.key, { serials })}
          />
        </div>
      ) : (
        <Field label="Quantité en stock" error={errors['variants.0.quantity']}>
          {(props) => (
            <Input
              {...props}
              className="tabular"
              inputMode="numeric"
              value={variant.quantity}
              placeholder="0"
              onChange={(event) => onChange(variant.key, { quantity: event.target.value.replace(/\D/g, '') })}
            />
          )}
        </Field>
      )}
    </div>
  );
}

function ExcludeButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ne plus proposer ${label}`}
      title="Ne pas proposer cette combinaison"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink max-md:size-10',
        className,
      )}
    >
      <X className="size-4" strokeWidth={1.8} />
    </button>
  );
}

/** Cellule de la table : libellé visible au téléphone seulement. */
function Cell({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.75rem] font-[650] text-ink-2 sm:hidden">{label}</span>
      {children}
      {error && (
        <span data-field-error className="text-[0.75rem] font-semibold text-danger-ink">
          {error}
        </span>
      )}
    </div>
  );
}
