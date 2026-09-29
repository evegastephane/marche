import {
  conditionDescription,
  conditionsFor,
  type Currency,
  DEVICE_KINDS,
  type InventoryLevelDto,
  KINDS,
  KINDS_BY_STORE_TYPE,
  MAX_PRODUCT_OPTIONS,
  type ProductDto,
  type ProductKind,
  type StoreType,
  type VerticalSettings,
} from '@marche/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Plus, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '@/shared/api/client';
import { useApi, useStoreKey } from '@/shared/api/use-api';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, plural } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/feedback';
import {
  Field,
  Input,
  InputWithSuffix,
  Select,
  Textarea,
} from '@/shared/ui/field';
import { glide as snappy } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';
import { Tabs } from '@/shared/ui/tabs';
import { MediaGallery } from '../media/media-gallery';
import { useBrands, useSaveProduct } from './api';
import { AccessoriesCard } from './form/accessories-card';
import { AttributesEditor } from './form/attributes-editor';
import { DeviceFinder } from './form/device-finder';
import { OptionEditor, Swatch } from './form/option-editor';
import { gridLayout, StockGrid } from './form/stock-grid';
import {
  applyDevice,
  colorOption,
  comboKey,
  type DraftErrors,
  draftFromProduct,
  draftToInput,
  emptyDraft,
  newKey,
  type OptionDraft,
  pendingCounts,
  presetOptions,
  type ProductDraft,
  regenerateVariants,
  suggestSku,
  swatchOf,
  type VariantDraft,
  withDefaultWarranty,
} from './product-draft';

const OTHER = 'OTHER';

/** Titre de la fiche selon la sorte d'article. */
function attributesTitle(kind: ProductKind): string {
  if (DEVICE_KINDS.includes(kind)) return 'Fiche technique';
  if (kind === 'ACCESSORY') return 'Caractéristiques';
  return 'Matière et entretien';
}

export function ProductForm({
  product,
  currency,
  storeType,
  verticalSettings,
}: {
  product?: ProductDto;
  currency: Currency;
  storeType: StoreType;
  /** Réglages de la boutique : garantie par défaut et états proposés (boutique Tech). */
  verticalSettings?: VerticalSettings;
}) {
  const defaultWarranty =
    storeType === 'ELECTRONICS'
      ? (verticalSettings?.warranty?.defaultMonths ?? null)
      : null;
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product
      ? draftFromProduct(product, currency)
      : withDefaultWarranty(
          emptyDraft(KINDS_BY_STORE_TYPE[storeType][0] ?? null),
          defaultWarranty,
        ),
  );
  // Fiche préremplie depuis le catalogue d'appareils : le brouillon d'avant, pour « Annuler ».
  const [applied, setApplied] = useState<{
    name: string;
    before: ProductDraft;
  } | null>(null);
  const storeConditions = conditionsFor(verticalSettings).map((c) => c.value);
  const conditionHints = Object.fromEntries(
    storeConditions.map((value) => [
      value,
      conditionDescription(verticalSettings, value) ?? '',
    ]),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [counting, setCounting] = useState(false);
  const save = useSaveProduct();
  const brands = useBrands();
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const unit = currencyLabel(currency);

  /** Toute modification des options recalcule les déclinaisons. */
  const update = (patch: Partial<ProductDraft>, regenerate = false) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      return regenerate
        ? { ...next, variants: regenerateVariants(next) }
        : next;
    });

  const setTitle = (title: string) =>
    setDraft((prev) => ({
      ...prev,
      title,
      variants: prev.variants.map((v) =>
        v.skuTouched ? v : { ...v, sku: suggestSku(title, v.optionValues) },
      ),
    }));

  /** Changer de sorte propose ses options, tant que celles d'un nouveau produit n'ont pas été retouchées. */
  const setKind = (kind: ProductKind | null) =>
    setDraft((prev) => {
      const shape = (options: OptionDraft[]) =>
        JSON.stringify(options.map((o) => [o.type, o.values]));
      const pristine = shape(prev.options) === shape(presetOptions(prev.kind));
      if (product || !pristine) return { ...prev, kind };
      const fresh = emptyDraft(kind);
      const next = withDefaultWarranty(
        {
          ...prev,
          kind,
          hasOptions: fresh.hasOptions,
          options: fresh.options,
          excluded: [],
        },
        defaultWarranty,
      );
      return { ...next, variants: regenerateVariants(next) };
    });

  const setVariant = (key: string, patch: Partial<VariantDraft>) =>
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.key === key ? { ...v, ...patch } : v,
      ),
    }));

  const setOption = (key: string, patch: Partial<OptionDraft>) =>
    update(
      {
        options: draft.options.map((o) =>
          o.key === key ? { ...o, ...patch } : o,
        ),
      },
      true,
    );

  /** Proposer ou retirer une combinaison (taille M en Or, par exemple). */
  const toggleCombo = (values: string[], offered: boolean) =>
    setDraft((prev) => {
      const key = comboKey(values);
      const excluded = offered
        ? prev.excluded.filter((k) => k !== key)
        : [...new Set([...prev.excluded, key])];
      const next = { ...prev, excluded };
      return { ...next, variants: regenerateVariants(next) };
    });

  const kinds = [...KINDS_BY_STORE_TYPE[storeType]];
  if (draft.kind && !kinds.includes(draft.kind)) kinds.push(draft.kind);
  const color = colorOption(draft);
  const grid = gridLayout(draft);
  const excludedCombos = draft.hasOptions
    ? draft.excluded.filter((k) => k.split('\u0001').every(Boolean))
    : [];
  const model =
    typeof draft.attributes.model === 'string' ? draft.attributes.model : '';

  const onSubmit = () => {
    setFormError(null);
    const result = draftToInput(draft, currency, product);
    if (result.errors) {
      setErrors(result.errors);
      setFormError('Quelques champs sont à corriger.');
      return;
    }
    setErrors({});
    const counts = pendingCounts(draft);
    save.mutate(
      { id: product?.id, input: result.input, publish: draft.publish },
      {
        onSuccess: async (saved) => {
          if (counts.length > 0) {
            setCounting(true);
            try {
              await api<InventoryLevelDto[]>(
                'POST',
                '/api/v1/inventory/counts',
                {
                  body: { entries: counts, reason: 'Comptage' },
                },
              );
              await queryClient.invalidateQueries({
                queryKey: ['store', store, 'inventory'],
              });
              await queryClient.invalidateQueries({
                queryKey: ['store', store, 'products'],
              });
            } catch (error) {
              toast.error('Produit enregistré, mais le comptage a échoué', {
                description: errorMessage(error),
              });
              setCounting(false);
              return;
            }
            setCounting(false);
          }
          toast(product ? 'Produit enregistré' : 'Produit créé', {
            description:
              counts.length > 0
                ? `Stock compté pour ${plural(counts.length, 'déclinaison', 'déclinaisons')}.`
                : saved.status === 'ACTIVE'
                  ? 'Il est en vente sur votre site.'
                  : 'Il reste en brouillon.',
          });
          void navigate({ to: '/products', search: { status: 'all' } });
        },
        onError: (error) => {
          if (
            error instanceof ApiError &&
            (error.code === 'VALIDATION_FAILED' ||
              error.code === 'INVALID_PRODUCT_KIND')
          ) {
            setErrors(error.fieldErrors);
          }
          setFormError(
            error instanceof ApiError
              ? error.message
              : 'L’enregistrement a échoué. Réessayez.',
          );
        },
      },
    );
  };

  const busy = save.isPending || counting;
  const saveButton = (
    <Button type="submit" variant="secondary" loading={busy}>
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
      <PageHeader
        title={product ? product.title : 'Nouveau produit'}
        actions={saveButton}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="L’article" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              {draft.kind && DEVICE_KINDS.includes(draft.kind) && (
                <DeviceFinder
                  applied={applied?.name ?? null}
                  onPick={(device) => {
                    const brandId =
                      brands.data?.items.find(
                        (b) =>
                          !b.archivedAt &&
                          b.name.toLowerCase() === device.brand.toLowerCase(),
                      )?.id ?? null;
                    setApplied({ name: device.name, before: draft });
                    setDraft((prev) =>
                      applyDevice(prev, device, {
                        brandId,
                        isNew: !product,
                        kinds,
                      }),
                    );
                  }}
                  onUndo={() => {
                    if (applied) setDraft(applied.before);
                    setApplied(null);
                  }}
                />
              )}
              <Field label="Nom" error={errors.title}>
                {(props) => (
                  <Input
                    {...props}
                    value={draft.title}
                    placeholder={
                      storeType === 'ELECTRONICS' ? 'iPhone 12' : 'Boubou brodé'
                    }
                    onChange={(e) => setTitle(e.target.value)}
                  />
                )}
              </Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem] font-[600] text-ink">
                  Sorte d’article
                </span>
                <Tabs
                  label="Sorte d’article"
                  items={[
                    ...kinds.map((k) => ({
                      value: k as string,
                      label: KINDS[k].label,
                    })),
                    { value: OTHER, label: 'Autre' },
                  ]}
                  value={draft.kind ?? OTHER}
                  onChange={(value) =>
                    setKind(value === OTHER ? null : (value as ProductKind))
                  }
                  className="self-start"
                />
                {errors.kind && (
                  <span className="text-[0.8125rem] font-[560] text-danger-ink">
                    {errors.kind}
                  </span>
                )}
              </div>
              <Field
                label="Description"
                hint="Ce qui aide à acheter : usage, coupe, points forts."
                error={errors.description}
              >
                {(props) => (
                  <Textarea
                    {...props}
                    value={draft.description}
                    placeholder={
                      storeType === 'ELECTRONICS'
                        ? 'Écran 6,1 pouces, double appareil photo, 5G.'
                        : 'Bazin riche brodé main, coupe ample.'
                    }
                    onChange={(e) => update({ description: e.target.value })}
                  />
                )}
              </Field>
              {(brands.data?.items.length ?? 0) > 0 && (
                <Field label="Marque">
                  {(props) => (
                    <Select
                      {...props}
                      value={draft.brandId}
                      onChange={(e) => update({ brandId: e.target.value })}
                    >
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

          <AnimatePresence initial={false} mode="popLayout">
            {draft.kind && (
              <motion.div
                key={draft.kind}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={snappy}
              >
                <Card>
                  <CardHeader title={attributesTitle(draft.kind)} />
                  <div className="px-5 pb-6">
                    <AttributesEditor
                      kind={draft.kind}
                      values={draft.attributes}
                      errors={errors}
                      onChange={(key, value) =>
                        update({
                          attributes: { ...draft.attributes, [key]: value },
                        })
                      }
                    />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader title="Photos" />
            <div className="flex flex-col gap-4 px-5 pb-6">
              <MediaGallery
                label="Photos du produit"
                media={draft.media}
                onChange={(media) => update({ media })}
                renderBadge={
                  color
                    ? (item) => {
                        const value = draft.mediaOptionValues[item.id];
                        return value ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[0.6875rem] font-[600] text-ink">
                            <Swatch
                              hex={swatchOf(color, value)}
                              className="size-2.5"
                            />
                            {value}
                          </span>
                        ) : null;
                      }
                    : undefined
                }
              />
              {color && draft.media.length > 0 && (
                <PhotoColors
                  draft={draft}
                  color={color}
                  onChange={(mediaOptionValues) =>
                    update({ mediaOptionValues })
                  }
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Prix et stock" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
                <Switch
                  checked={draft.hasOptions}
                  onChange={(checked) => update({ hasOptions: checked }, true)}
                />
                <span className="flex flex-col">
                  <span className="font-[600]">Plusieurs déclinaisons</span>
                  <span className="text-[0.875rem] text-ink-2">
                    {storeType === 'ELECTRONICS'
                      ? 'Stockage, couleur, état… Chaque combinaison a son prix et son stock.'
                      : 'Tailles, couleurs… Chaque combinaison a son prix et son stock.'}
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
                          suggestions={
                            option.type === 'condition' &&
                            storeType === 'ELECTRONICS'
                              ? storeConditions
                              : undefined
                          }
                          hintsByValue={
                            storeType === 'ELECTRONICS'
                              ? conditionHints
                              : undefined
                          }
                          onRemove={
                            draft.options.length > 1
                              ? () =>
                                  update(
                                    {
                                      options: draft.options.filter(
                                        (o) => o.key !== option.key,
                                      ),
                                    },
                                    true,
                                  )
                              : undefined
                          }
                        />
                      ))}
                      {errors.options && (
                        <p className="text-[0.8125rem] font-semibold text-danger-ink">
                          {errors.options}
                        </p>
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
                                  name: '',
                                  type: 'text',
                                  values: [],
                                  swatches: {},
                                },
                              ],
                            })
                          }
                        >
                          Ajouter une option
                        </Button>
                      )}
                    </div>

                    {grid &&
                      draft.variants.some((v) => v.optionValues.length > 0) && (
                        <Tabs
                          label="Présentation des déclinaisons"
                          items={[
                            { value: 'grid' as const, label: 'Grille' },
                            { value: 'list' as const, label: 'Liste' },
                          ]}
                          value={view}
                          onChange={setView}
                          className="self-start"
                        />
                      )}
                    {grid && view === 'grid' ? (
                      <StockGrid
                        draft={draft}
                        isEdit={Boolean(product)}
                        onChangeVariant={setVariant}
                        onToggleCombo={toggleCombo}
                      />
                    ) : (
                      <VariantTable
                        draft={draft}
                        errors={errors}
                        unit={unit}
                        onChange={setVariant}
                        onExclude={(values) => toggleCombo(values, false)}
                        isEdit={Boolean(product)}
                      />
                    )}
                    {grid && view === 'grid' && (
                      <VariantPrices
                        draft={draft}
                        errors={errors}
                        unit={unit}
                        onChange={setVariant}
                      />
                    )}
                    {!(grid && view === 'grid') &&
                      excludedCombos.length > 0 && (
                        <ExcludedCombos
                          combos={excludedCombos}
                          onRestore={(values) => toggleCombo(values, true)}
                        />
                      )}
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
                      <SingleVariant
                        variant={draft.variants[0]}
                        errors={errors}
                        unit={unit}
                        onChange={setVariant}
                      />
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </Card>

          {draft.kind && draft.kind !== 'ACCESSORY' && (
            <AccessoriesCard
              productId={product?.id}
              kind={draft.kind}
              model={model}
              accessories={draft.accessories}
              onChange={(accessories) => update({ accessories })}
            />
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-10">
          <Card as="fieldset" className="flex flex-col gap-3 p-5">
            <legend className="sr-only">Mise en vente</legend>
            <p className="heading text-[1rem]">Mise en vente</p>
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
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            className="w-full"
          >
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
        !checked && 'hover:bg-surface-2',
      )}
    >
      {checked && (
        <motion.span
          layoutId="publish-choice"
          aria-hidden
          className="absolute inset-0 rounded-xl bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
          transition={snappy}
        />
      )}
      <input
        type="radio"
        name="publication"
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'relative mt-0.5 inline-flex size-[1.125rem] shrink-0 items-center justify-center rounded-full transition-shadow duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
          checked
            ? 'shadow-[inset_0_0_0_5px_var(--color-ink)]'
            : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]',
        )}
      />
      <span className="relative flex flex-col">
        <span className="font-[600]">{title}</span>
        <span className="text-[0.8125rem] text-ink-2">{detail}</span>
      </span>
    </label>
  );
}

/** Couleur de chaque photo : sur le site, la galerie montre celles de la couleur choisie. */
function PhotoColors({
  draft,
  color,
  onChange,
}: {
  draft: ProductDraft;
  color: OptionDraft;
  onChange: (values: Record<string, string>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.8125rem] font-[600]">Couleur des photos</span>
        <span className="text-[0.8125rem] text-ink-2">
          Sur votre site, la galerie suit la couleur choisie. Une photo sans
          couleur reste toujours visible.
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {draft.media.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3">
            <img
              src={item.renditions['400'] ?? item.url}
              alt=""
              className="size-10 shrink-0 rounded-[0.55rem] object-cover ring-1 ring-line"
            />
            <Select
              aria-label={`Couleur de la photo ${index + 1}`}
              value={draft.mediaOptionValues[item.id] ?? ''}
              onChange={(e) => {
                const next = { ...draft.mediaOptionValues };
                if (e.target.value) next[item.id] = e.target.value;
                else delete next[item.id];
                onChange(next);
              }}
            >
              <option value="">Toutes les couleurs</option>
              {color.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>
    </div>
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
            onChange={(e) =>
              onChange(variant.key, { compareAt: e.target.value })
            }
          />
        )}
      </Field>
      <Field
        label="SKU"
        hint="Référence unique de l’article."
        error={errors['variants.0.sku']}
      >
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
          <span className="text-[0.8125rem] font-[600]">Stock disponible</span>
          <span className="display-window flex h-10 items-center justify-end rounded-[0.7rem] px-3.5 max-md:h-11">
            <AnimatedNumber
              value={variant.available ?? 0}
              className="readout text-[1.5rem]"
            />
          </span>
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

/** Pastilles de valeurs d'une déclinaison (couleur avec sa teinte). */
function ComboLabel({
  draft,
  values,
}: {
  draft: ProductDraft;
  values: string[];
}) {
  const color = colorOption(draft);
  const colorIndex = color
    ? draft.options
        .filter((o) => o.name.trim() && o.values.length > 0)
        .indexOf(color)
    : -1;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {values.map((value, j) => (
        <span
          key={j}
          className="well inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.8125rem] font-[560]"
        >
          {j === colorIndex && color && (
            <Swatch hex={swatchOf(color, value)} className="size-3" />
          )}
          {value}
        </span>
      ))}
    </span>
  );
}

function VariantTable({
  draft,
  errors,
  unit,
  onChange,
  onExclude,
  isEdit,
}: {
  draft: ProductDraft;
  errors: DraftErrors;
  unit: string;
  onChange: (key: string, patch: Partial<VariantDraft>) => void;
  onExclude: (values: string[]) => void;
  isEdit: boolean;
}) {
  const ready = draft.variants.some((v) => v.optionValues.length > 0);
  if (!ready) {
    return (
      <p className="text-[0.875rem] text-ink-2">
        Ajoutez des valeurs : les déclinaisons apparaîtront ici.
      </p>
    );
  }
  const removable = draft.variants.length > 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="heading text-[0.9375rem]">
          {plural(draft.variants.length, 'déclinaison', 'déclinaisons')}
        </p>
        {isEdit && (
          <p className="text-[0.8125rem] text-ink-2">
            Retirer une combinaison archive sa déclinaison.
          </p>
        )}
      </div>
      <div
        aria-hidden
        className="legend hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem_2.25rem] gap-3 px-3.5 sm:grid"
      >
        <span>Déclinaison</span>
        <span>SKU</span>
        <span>Prix</span>
        <span>{isEdit ? 'Stock' : 'Stock initial'}</span>
        <span />
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
              className="grid gap-3 px-3.5 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem_2.25rem] sm:items-start"
            >
              <div className="flex items-start justify-between gap-2 sm:pt-2">
                <ComboLabel draft={draft} values={variant.optionValues} />
                {removable && (
                  <ExcludeButton
                    label={variant.optionValues.join(' / ')}
                    onClick={() => onExclude(variant.optionValues)}
                    className="sm:hidden"
                  />
                )}
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
                  onChange={(e) =>
                    onChange(variant.key, { price: e.target.value })
                  }
                />
              </CellField>
              {variant.id ? (
                <CellField label="Dispo">
                  <span className="tabular flex h-9 items-center font-[600] text-ink">
                    {variant.available ?? 0}
                  </span>
                </CellField>
              ) : (
                <CellField
                  label="Stock"
                  error={errors[`variants.${i}.quantity`]}
                >
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
              <span className="hidden sm:flex sm:pt-0.5">
                {removable && (
                  <ExcludeButton
                    label={variant.optionValues.join(' / ')}
                    onClick={() => onExclude(variant.optionValues)}
                  />
                )}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function ExcludeButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
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

/** Combinaisons non proposées, qu'on remet d'un geste. */
function ExcludedCombos({
  combos,
  onRestore,
}: {
  combos: string[];
  onRestore: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-[600]">
        Combinaisons non proposées
      </span>
      <div className="flex flex-wrap gap-1.5">
        {combos.map((key) => {
          const values = key.split('\u0001');
          return (
            <button
              key={key}
              type="button"
              onClick={() => onRestore(values)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-[560] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:bg-surface-2 hover:text-ink max-md:h-10"
            >
              <RotateCcw className="size-3.5" strokeWidth={1.8} aria-hidden />
              {values.join(' / ')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Prix des déclinaisons, sous la grille : un prix par combinaison, regroupé quand tout est au même prix.
 * Les SKU et prix fins se règlent dans la vue Liste.
 */
function VariantPrices({
  draft,
  errors,
  unit,
  onChange,
}: {
  draft: ProductDraft;
  errors: DraftErrors;
  unit: string;
  onChange: (key: string, patch: Partial<VariantDraft>) => void;
}) {
  const prices = new Set(draft.variants.map((v) => v.price));
  const same = prices.size <= 1;
  const [price, setPrice] = useState(
    same ? (draft.variants[0]?.price ?? '') : '',
  );
  const priceError = Object.entries(errors).find(([key]) =>
    /^variants\.\d+\.price$/.test(key),
  )?.[1];
  const skuError = Object.entries(errors).find(([key]) =>
    /^variants\.\d+\.sku$/.test(key),
  )?.[1];

  return (
    <div className="flex flex-col gap-3">
      <Field
        label={
          same
            ? 'Prix de toutes les déclinaisons'
            : 'Même prix pour toutes les déclinaisons'
        }
        hint={
          same
            ? 'Un prix par déclinaison : vue Liste.'
            : 'Les déclinaisons ont des prix différents (vue Liste). Un prix ici les aligne.'
        }
        error={priceError}
        className="max-w-xs"
      >
        {(props) => (
          <InputWithSuffix
            {...props}
            suffix={unit}
            inputMode="decimal"
            value={price}
            placeholder="0"
            onChange={(e) => {
              setPrice(e.target.value);
              for (const v of draft.variants)
                onChange(v.key, { price: e.target.value });
            }}
          />
        )}
      </Field>
      {skuError && (
        <p className="text-[0.8125rem] font-[560] text-danger-ink">
          {skuError} Corrigez les SKU dans la vue Liste.
        </p>
      )}
    </div>
  );
}

/** Cellule de la table des déclinaisons : libellé visible au téléphone seulement. */
function CellField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.75rem] font-[650] text-ink-2 sm:hidden">
        {label}
      </span>
      {children}
      {error && (
        <span className="text-[0.75rem] font-semibold text-danger-ink">
          {error}
        </span>
      )}
    </div>
  );
}
