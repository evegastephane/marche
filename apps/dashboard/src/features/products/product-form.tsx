import type { Currency, ProductDto } from '@marche/contracts';
import { MAX_PRODUCT_OPTIONS } from '@marche/contracts';
import { useNavigate } from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type KeyboardEvent, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, plural } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/feedback';
import { Field, Input, InputWithSuffix, Select, Textarea } from '@/shared/ui/field';
import { snappy } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';
import { useBrands, useSaveProduct } from './api';
import {
  type DraftErrors,
  draftFromProduct,
  draftToInput,
  emptyDraft,
  newKey,
  type OptionDraft,
  type ProductDraft,
  regenerateVariants,
  suggestSku,
  type VariantDraft,
} from './product-draft';

export function ProductForm({ product, currency }: { product?: ProductDto; currency: Currency }) {
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product ? draftFromProduct(product, currency) : emptyDraft(),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const save = useSaveProduct();
  const brands = useBrands();
  const navigate = useNavigate();
  const unit = currencyLabel(currency);

  /** Toute modification des options recalcule les déclinaisons. */
  const update = (patch: Partial<ProductDraft>, regenerate = false) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      return regenerate ? { ...next, variants: regenerateVariants(next) } : next;
    });

  const setTitle = (title: string) =>
    setDraft((prev) => ({
      ...prev,
      title,
      variants: prev.variants.map((v) => (v.skuTouched ? v : { ...v, sku: suggestSku(title, v.optionValues) })),
    }));

  const setVariant = (key: string, patch: Partial<VariantDraft>) =>
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    }));

  const setOption = (key: string, patch: Partial<OptionDraft>) =>
    update(
      {
        options: draft.options.map((o) => (o.key === key ? { ...o, ...patch } : o)),
      },
      true,
    );

  const onSubmit = () => {
    setFormError(null);
    const result = draftToInput(draft, currency, product);
    if (result.errors) {
      setErrors(result.errors);
      setFormError('Quelques champs sont à corriger.');
      return;
    }
    setErrors({});
    save.mutate(
      { id: product?.id, input: result.input, publish: draft.publish },
      {
        onSuccess: (saved) => {
          toast(product ? 'Produit enregistré' : 'Produit créé', {
            description: saved.status === 'ACTIVE' ? 'Il est en vente sur votre site.' : 'Il reste en brouillon.',
          });
          void navigate({ to: '/products', search: { status: 'all' } });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') setErrors(error.fieldErrors);
          setFormError(error instanceof ApiError ? error.message : 'L’enregistrement a échoué. Réessayez.');
        },
      },
    );
  };

  const saveButton = (
    <Button type="submit" loading={save.isPending}>
      {product ? 'Enregistrer' : 'Créer le produit'}
    </Button>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <PageHeader title={product ? product.title : 'Nouveau produit'} actions={saveButton} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="L’article" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <Field label="Nom" error={errors.title}>
                {(props) => (
                  <Input
                    {...props}
                    value={draft.title}
                    placeholder="Boubou brodé"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Description"
                hint="Matière, dimensions, entretien : ce qui aide à acheter."
                error={errors.description}
              >
                {(props) => (
                  <Textarea
                    {...props}
                    value={draft.description}
                    placeholder="Bazin riche brodé main, coupe ample."
                    onChange={(e) => update({ description: e.target.value })}
                  />
                )}
              </Field>
              {(brands.data?.items.length ?? 0) > 0 && (
                <Field label="Marque">
                  {(props) => (
                    <Select {...props} value={draft.brandId} onChange={(e) => update({ brandId: e.target.value })}>
                      <option value="">Aucune</option>
                      {brands.data?.items
                        .filter((b) => !b.archivedAt)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </Select>
                  )}
                </Field>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Prix et stock" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2 px-4 py-3">
                <Switch checked={draft.hasOptions} onChange={(checked) => update({ hasOptions: checked }, true)} />
                <span className="flex flex-col">
                  <span className="font-[650]">Plusieurs déclinaisons</span>
                  <span className="text-[0.875rem] text-ink-2">
                    Tailles, couleurs, contenances… Chaque combinaison a son prix et son stock.
                  </span>
                </span>
              </label>

              <AnimatePresence mode="wait" initial={false}>
                {draft.hasOptions ? (
                  <motion.div
                    key="options"
                    className="flex flex-col gap-5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={snappy}
                  >
                    <div className="flex flex-col gap-4">
                      {draft.options.map((option, index) => (
                        <OptionEditor
                          key={option.key}
                          option={option}
                          nameError={errors[`options.${index}.name`]}
                          valuesError={errors[`options.${index}.values`]}
                          onChange={(patch) => setOption(option.key, patch)}
                          onRemove={
                            draft.options.length > 1
                              ? () =>
                                  update(
                                    {
                                      options: draft.options.filter((o) => o.key !== option.key),
                                    },
                                    true,
                                  )
                              : undefined
                          }
                        />
                      ))}
                      {errors.options && (
                        <p className="text-[0.8125rem] font-semibold text-danger-ink">{errors.options}</p>
                      )}
                      {draft.options.length < MAX_PRODUCT_OPTIONS && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Plus />}
                          className="self-start"
                          onClick={() =>
                            update({
                              options: [
                                ...draft.options,
                                {
                                  key: newKey(),
                                  name: draft.options.length === 1 ? 'Couleur' : '',
                                  values: [],
                                },
                              ],
                            })
                          }
                        >
                          Ajouter une option
                        </Button>
                      )}
                    </div>
                    <VariantTable
                      draft={draft}
                      errors={errors}
                      unit={unit}
                      onChange={setVariant}
                      isEdit={Boolean(product)}
                    />
                  </motion.div>
                ) : (
                  draft.variants[0] && (
                    <motion.div
                      key="single"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={snappy}
                    >
                      <SingleVariant variant={draft.variants[0]} errors={errors} unit={unit} onChange={setVariant} />
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-10">
          <Card as="fieldset" className="flex flex-col gap-3 p-5">
            <legend className="sr-only">Mise en vente</legend>
            <p className="heading text-[1.0625rem]">Mise en vente</p>
            <PublishChoice
              checked={draft.publish}
              onSelect={() => update({ publish: true })}
              title="En vente"
              detail="Visible sur votre site dès l’enregistrement."
            />
            <PublishChoice
              checked={!draft.publish}
              onSelect={() => update({ publish: false })}
              title="Brouillon"
              detail="Invisible sur le site, en attendant."
            />
          </Card>
          <AnimatePresence>
            {formError && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={snappy}
                className="rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] font-semibold text-danger-ink"
              >
                {formError}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" size="lg" loading={save.isPending} className="w-full">
            {product ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </aside>
      </div>
    </form>
  );
}

function PublishChoice({
  checked,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer items-start gap-3 rounded-xl px-3.5 py-3 transition-colors duration-200',
        !checked && 'shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-surface-2',
      )}
    >
      {checked && (
        <motion.span
          layoutId="publish-choice"
          aria-hidden
          className="absolute inset-0 rounded-xl bg-brand-soft shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
          transition={snappy}
        />
      )}
      <input type="radio" name="publication" checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'relative mt-0.5 inline-flex size-[1.125rem] shrink-0 items-center justify-center rounded-full transition-shadow duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
          checked
            ? 'shadow-[inset_0_0_0_5px_var(--color-brand)]'
            : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]',
        )}
      />
      <span className="relative flex flex-col">
        <span className="font-[660]">{title}</span>
        <span className="text-[0.8125rem] text-ink-2">{detail}</span>
      </span>
    </label>
  );
}

function OptionEditor({
  option,
  onChange,
  onRemove,
  nameError,
  valuesError,
}: {
  option: OptionDraft;
  onChange: (patch: Partial<OptionDraft>) => void;
  onRemove?: () => void;
  nameError?: string;
  valuesError?: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const values = input
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && !option.values.includes(v));
    if (values.length > 0) onChange({ values: [...option.values, ...values] });
    setInput('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !input && option.values.length > 0) {
      onChange({ values: option.values.slice(0, -1) });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={snappy}
      className="grid gap-3 rounded-xl p-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-[11rem_1fr_auto]"
    >
      <Field label="Option" error={nameError}>
        {(props) => (
          <Input
            {...props}
            value={option.name}
            placeholder="Taille"
            onChange={(e) => onChange({ name: e.target.value })}
          />
        )}
      </Field>
      <Field label="Valeurs" hint="Entrée ou virgule pour ajouter." error={valuesError}>
        {(props) => (
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl bg-surface px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1.5px_var(--color-brand),0_0_0_4px_var(--color-brand-soft)]">
            <AnimatePresence initial={false}>
              {option.values.map((value) => (
                <motion.span
                  key={value}
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={snappy}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-brand pr-1 pl-3 text-[0.8125rem] font-[650] text-on-brand"
                >
                  {value}
                  <button
                    type="button"
                    aria-label={`Retirer ${value}`}
                    onClick={() =>
                      onChange({
                        values: option.values.filter((v) => v !== value),
                      })
                    }
                    className="-my-1 inline-flex size-7 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <input
              {...props}
              value={input}
              placeholder={option.values.length === 0 ? 'S, M, L' : ''}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={add}
              className="h-7 min-w-24 flex-1 bg-transparent px-1 text-ink outline-none placeholder:text-ink-3 max-md:text-base"
            />
          </div>
        )}
      </Field>
      {onRemove && (
        <Button
          variant="ghost"
          className="w-10 self-start px-0 max-md:w-11 max-sm:justify-self-end sm:mt-6"
          onClick={onRemove}
          aria-label={`Retirer l’option ${option.name}`}
        >
          <X />
        </Button>
      )}
    </motion.div>
  );
}

function SingleVariant({
  variant,
  errors,
  unit,
  onChange,
}: {
  variant: VariantDraft;
  errors: DraftErrors;
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
            onChange={(e) => onChange(variant.key, { price: e.target.value })}
          />
        )}
      </Field>
      <Field
        label="Prix avant remise"
        hint="Facultatif : affiché barré sur le site."
        error={errors['variants.0.compareAt']}
      >
        {(props) => (
          <InputWithSuffix
            {...props}
            suffix={unit}
            inputMode="decimal"
            value={variant.compareAt}
            onChange={(e) => onChange(variant.key, { compareAt: e.target.value })}
          />
        )}
      </Field>
      <Field label="SKU" hint="Référence unique de l’article." error={errors['variants.0.sku']}>
        {(props) => (
          <Input
            {...props}
            className="tabular uppercase"
            value={variant.sku}
            spellCheck={false}
            onChange={(e) =>
              onChange(variant.key, {
                sku: e.target.value.toUpperCase(),
                skuTouched: true,
              })
            }
          />
        )}
      </Field>
      {variant.id ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-[650]">Stock disponible</span>
          <AnimatedNumber value={variant.available ?? 0} className="display text-[2rem] text-brand-ink" />
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
              onChange={(e) =>
                onChange(variant.key, {
                  quantity: e.target.value.replace(/\D/g, ''),
                })
              }
            />
          )}
        </Field>
      )}
    </div>
  );
}

function VariantTable({
  draft,
  errors,
  unit,
  onChange,
  isEdit,
}: {
  draft: ProductDraft;
  errors: DraftErrors;
  unit: string;
  onChange: (key: string, patch: Partial<VariantDraft>) => void;
  isEdit: boolean;
}) {
  const ready = draft.variants.some((v) => v.optionValues.length > 0);
  if (!ready) {
    return <p className="text-[0.875rem] text-ink-2">Ajoutez des valeurs : les déclinaisons apparaîtront ici.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="heading text-[1rem]">{plural(draft.variants.length, 'déclinaison', 'déclinaisons')}</p>
        {isEdit && <p className="text-[0.8125rem] text-ink-2">Retirer une valeur archive ses déclinaisons.</p>}
      </div>
      <div
        aria-hidden
        className="eyebrow hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem] gap-3 px-3.5 sm:grid"
      >
        <span>Déclinaison</span>
        <span>SKU</span>
        <span>Prix</span>
        <span>{isEdit ? 'Stock' : 'Stock initial'}</span>
      </div>
      <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
        <AnimatePresence initial={false}>
          {draft.variants.map((variant, i) => (
            <motion.li
              key={variant.key}
              layout="position"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={snappy}
              className="grid gap-3 px-3.5 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem] sm:items-start"
            >
              <div className="flex flex-wrap items-center gap-1.5 sm:pt-2">
                {variant.optionValues.map((value, j) => (
                  <span key={j} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[0.8125rem] font-[680]">
                    {value}
                  </span>
                ))}
              </div>
              <CellField label="SKU" error={errors[`variants.${i}.sku`]}>
                <Input
                  aria-label={`SKU ${variant.optionValues.join(' ')}`}
                  className="tabular h-9 text-[0.8125rem] uppercase"
                  value={variant.sku}
                  spellCheck={false}
                  onChange={(e) =>
                    onChange(variant.key, {
                      sku: e.target.value.toUpperCase(),
                      skuTouched: true,
                    })
                  }
                />
              </CellField>
              <CellField label="Prix" error={errors[`variants.${i}.price`]}>
                <InputWithSuffix
                  aria-label={`Prix ${variant.optionValues.join(' ')}`}
                  suffix={unit}
                  inputMode="decimal"
                  className="h-9"
                  value={variant.price}
                  placeholder="0"
                  onChange={(e) => onChange(variant.key, { price: e.target.value })}
                />
              </CellField>
              {variant.id ? (
                <CellField label="Dispo">
                  <span className="tabular flex h-9 items-center font-[700] text-brand-ink">
                    {variant.available ?? 0}
                  </span>
                </CellField>
              ) : (
                <CellField label="Stock" error={errors[`variants.${i}.quantity`]}>
                  <Input
                    aria-label={`Stock ${variant.optionValues.join(' ')}`}
                    className="tabular h-9"
                    inputMode="numeric"
                    value={variant.quantity}
                    placeholder="0"
                    onChange={(e) =>
                      onChange(variant.key, {
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                  />
                </CellField>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/** Cellule de la table des déclinaisons : libellé visible au téléphone seulement. */
function CellField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.75rem] font-[650] text-ink-2 sm:hidden">{label}</span>
      {children}
      {error && <span className="text-[0.75rem] font-semibold text-danger-ink">{error}</span>}
    </div>
  );
}
