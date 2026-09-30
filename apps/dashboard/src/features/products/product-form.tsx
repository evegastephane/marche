import type { Currency, ProductDto, StoreType, VerticalSettings } from '@marche/contracts';
import { Link, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { MediaGallery } from '../media/media-gallery';
import { useAddAttributeValues } from '../categories/api';
import { useBrands, useSaveProduct, useSkuCheck } from './api';
import { AccessoriesCard } from './form/accessories-card';
import { AxisPicker } from './form/axis-picker';
import { CategorySelect } from './form/category-select';
import { DeviceFinder } from './form/device-finder';
import { SpecFields } from './form/spec-fields';
import { Swatch } from './form/swatch';
import { SingleVariant, VariantTable } from './form/variant-table';
import {
  activeAxes,
  axesOf,
  colorAxis,
  type DraftErrors,
  draftPublishProblems,
  draftToInput,
  errorLabels,
  missingDeviceValues,
  type ProductDraft,
  specAttributesOf,
  swatchOf,
} from './model/product-draft';
import { useProductDraft } from './model/use-product-draft';

/** Valeur recopiée après un temps de repos (vérification des SKU pendant la frappe). */
function useSettled<T>(value: T, delay = 400): T {
  const [settled, setSettled] = useState(value);
  const key = JSON.stringify(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(JSON.parse(key) as T), delay);
    return () => clearTimeout(timer);
  }, [key, delay]);
  return settled;
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
  /** Réglages de la boutique : garantie par défaut (boutique Tech). */
  verticalSettings?: VerticalSettings;
}) {
  const defaultWarranty = storeType === 'ELECTRONICS' ? (verticalSettings?.warranty?.defaultMonths ?? null) : null;
  const state = useProductDraft({ product, currency, defaultWarranty });
  const { draft, attributes, tracksUnits } = state;
  const [applied, setApplied] = useState<{ name: string; before: ProductDraft } | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const save = useSaveProduct();
  const brands = useBrands();
  const addValues = useAddAttributeValues();
  const navigate = useNavigate();
  const unit = currencyLabel(currency);

  const check = useSkuCheck(
    useSettled({
      skus: [...new Set(draft.variants.map((v) => v.sku.trim().toUpperCase()).filter((sku) => /^[A-Z0-9][A-Z0-9._-]*$/.test(sku)))],
      reference: draft.reference.trim() || null,
      excludeProductId: product?.id,
    }),
  );
  const takenSkus = new Set(check.data?.takenSkus ?? []);
  const referenceTaken = Boolean(check.data?.referenceTaken && draft.reference.trim());

  const axes = axesOf(attributes);
  const hasVariants = activeAxes(draft, attributes).length > 0;
  const color = colorAxis(attributes);
  const pickedColors = color ? (draft.axes[color.slug] ?? []) : [];
  const problems = state.category ? draftPublishProblems(draft, attributes) : [];
  const device = tracksUnits || axes.some((axis) => axis.slug === 'stockage');
  const model = typeof draft.specs.modele === 'string' && draft.specs.modele ? draft.specs.modele : draft.title;

  const showErrors = (next: DraftErrors, prefix: string) => {
    setErrors(next);
    const labels = errorLabels(draft, attributes, next);
    const shown = labels.slice(0, 3).join(', ');
    const more = labels.length > 3 ? ` et ${labels.length - 3} autre${labels.length > 4 ? 's' : ''}` : '';
    setFormError(`${prefix} ${shown}${more}.`);
    revealFirstError();
  };

  const onSubmit = () => {
    setFormError(null);
    const result = draftToInput(draft, { attributes, tracksUnits, currency, existing: product });
    if (result.errors) return showErrors(result.errors, 'À corriger :');
    if (takenSkus.size > 0 && draft.variants.some((v) => takenSkus.has(v.sku.trim().toUpperCase()))) {
      return showErrors({ variants: 'Un SKU est déjà pris par un autre produit.' }, 'À corriger :');
    }
    if (draft.publish && problems.length > 0) {
      return showErrors(
        Object.fromEntries(
          problems.map((problem) => [
            axes.some((axis) => axis.slug === problem.slug) ? `axes.${problem.slug}` : `specs.${problem.slug}`,
            problem.message,
          ]),
        ),
        'Pour le mettre en vente, complétez :',
      );
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
          if (error instanceof ApiError && error.code === 'VALIDATION_FAILED' && Object.keys(error.fieldErrors).length > 0) {
            return showErrors(error.fieldErrors, 'Refusé par le serveur, à corriger :');
          }
          setFormError(error instanceof ApiError ? error.message : 'L’enregistrement a échoué. Réessayez.');
        },
      },
    );
  };

  const submitLabel = product ? 'Enregistrer' : 'Créer le produit';

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
        actions={
          <Button type="submit" variant="secondary" loading={save.isPending}>
            {submitLabel}
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Le produit" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <CategorySelect value={draft.categoryId} error={errors.categoryId} onChange={(id) => void state.setCategory(id)} />
              {device && (
                <DeviceFinder
                  applied={applied?.name ?? null}
                  onPick={(picked) => {
                    const brandId =
                      brands.data?.items.find((b) => !b.archivedAt && b.name.toLowerCase() === picked.brand.toLowerCase())?.id ?? null;
                    setApplied({ name: picked.name, before: draft });
                    void state.applyDevice(picked, brandId, async () => {
                      const plan = product ? [] : missingDeviceValues(picked, attributes);
                      for (const step of plan) await addValues.mutateAsync({ id: step.attributeId, values: step.values });
                      return plan.length > 0;
                    });
                  }}
                  onUndo={() => {
                    if (applied) state.setDraft(applied.before);
                    setApplied(null);
                  }}
                />
              )}
              <Field label="Nom" error={errors.title}>
                {(props) => (
                  <Input
                    {...props}
                    value={draft.title}
                    placeholder={storeType === 'ELECTRONICS' ? 'iPhone 17 Pro' : 'Boubou brodé'}
                    onChange={(event) => state.setTitle(event.target.value)}
                  />
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Référence"
                  hint={`Préfixe des SKU : ${draft.variants[0]?.sku || 'IP17P-256-NOI'}`}
                  error={errors.reference ?? (referenceTaken ? 'Déjà utilisée par un autre produit.' : undefined)}
                >
                  {(props) => (
                    <Input
                      {...props}
                      className="tabular uppercase"
                      value={draft.reference}
                      placeholder="IP17P"
                      spellCheck={false}
                      maxLength={32}
                      onChange={(event) => state.setReference(event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Garantie" hint="En mois ; vide si aucune." error={errors.warrantyMonths}>
                  {(props) => (
                    <div className="relative">
                      <Input
                        {...props}
                        className="tabular pr-16"
                        inputMode="numeric"
                        value={draft.warranty}
                        onChange={(event) => state.update({ warranty: event.target.value.replace(/\D/g, '') })}
                      />
                      <span className="legend pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">mois</span>
                    </div>
                  )}
                </Field>
              </div>
              {(brands.data?.items.length ?? 0) > 0 && (
                <Field label="Marque">
                  {(props) => (
                    <Select {...props} value={draft.brandId} onChange={(event) => state.update({ brandId: event.target.value })}>
                      <option value="">Aucune</option>
                      {brands.data?.items
                        .filter((b) => !b.archivedAt || b.id === draft.brandId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </Select>
                  )}
                </Field>
              )}
              <Field label="Description" hint="Ce qui aide à acheter : usage, points forts." error={errors.description}>
                {(props) => (
                  <Textarea {...props} value={draft.description} onChange={(event) => state.update({ description: event.target.value })} />
                )}
              </Field>
            </div>
          </Card>

          <AnimatePresence initial={false} mode="popLayout">
            {draft.categoryId && (
              <motion.div
                key={draft.categoryId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={glide}
              >
                <Card>
                  <CardHeader
                    title="Fiche technique"
                    actions={
                      state.category && (
                        <span className="truncate text-[0.8125rem] text-ink-2">
                          {state.category.path.map((step) => step.name).join(' › ')}
                        </span>
                      )
                    }
                  />
                  <div className="px-5 pb-6">
                    {state.categoryLoading ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                      </div>
                    ) : specAttributesOf(attributes).length > 0 ? (
                      <SpecFields attributes={attributes} values={draft.specs} errors={errors} onChange={state.setSpec} />
                    ) : (
                      <p className="text-[0.9375rem] text-ink-2">
                        Cette catégorie n’a pas encore d’attributs.{' '}
                        <Link to="/categories" className="font-[600] text-ink underline decoration-line-strong underline-offset-4">
                          Lui en ajouter
                        </Link>
                      </p>
                    )}
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
                onChange={(media) => state.update({ media })}
                renderBadge={
                  color
                    ? (item) => {
                        const value = draft.mediaOptionValues[item.id];
                        return value ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[0.6875rem] font-[600] text-ink">
                            <Swatch hex={swatchOf(color, value)} className="size-2.5" />
                            {value}
                          </span>
                        ) : null;
                      }
                    : undefined
                }
              />
              {pickedColors.length > 0 && draft.media.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.8125rem] font-[600]">Couleur des photos</span>
                    <span className="text-[0.8125rem] text-ink-2">
                      Sur votre site, la galerie suit la couleur choisie. Une photo sans couleur reste toujours visible.
                    </span>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {draft.media.map((item, index) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <img src={item.renditions['400'] ?? item.url} alt="" className="size-10 shrink-0 rounded-[0.55rem] object-cover ring-1 ring-line" />
                        <Select
                          aria-label={`Couleur de la photo ${index + 1}`}
                          value={draft.mediaOptionValues[item.id] ?? ''}
                          onChange={(event) => {
                            const next = { ...draft.mediaOptionValues };
                            if (event.target.value) next[item.id] = event.target.value;
                            else delete next[item.id];
                            state.update({ mediaOptionValues: next });
                          }}
                        >
                          <option value="">Toutes les couleurs</option>
                          {pickedColors.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={axes.length > 0 ? 'Variantes et stock' : 'Prix et stock'} />
            <div className="flex flex-col gap-6 px-5 pb-6">
              {tracksUnits && (
                <p className="well rounded-xl px-4 py-3 text-[0.875rem] text-ink-2">
                  <span className="font-[600] text-ink">Suivi à l’unité.</span> Le stock de cette catégorie se compte en IMEI ou numéros
                  de série : saisissez-les à la création, puis depuis Stock.
                </p>
              )}
              <AxisPicker
                attributes={attributes}
                picked={draft.axes}
                errors={errors}
                onToggle={state.toggleAxisValue}
                onAdded={state.pickNewAxisValue}
              />
              {hasVariants ? (
                <VariantTable
                  draft={draft}
                  attributes={attributes}
                  tracksUnits={tracksUnits}
                  errors={errors}
                  takenSkus={takenSkus}
                  unit={unit}
                  onChange={state.setVariant}
                  onToggleCombination={state.toggleCombination}
                />
              ) : (
                draft.variants[0] && (
                  <SingleVariant
                    variant={draft.variants[0]}
                    tracksUnits={tracksUnits}
                    errors={errors}
                    takenSkus={takenSkus}
                    unit={unit}
                    onChange={state.setVariant}
                  />
                )
              )}
            </div>
          </Card>

          <AccessoriesCard
            productId={product?.id}
            device={device}
            model={model}
            accessories={draft.accessories}
            onChange={(accessories) => state.update({ accessories })}
          />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-10">
          <Card as="fieldset" className="flex flex-col gap-3 p-5">
            <legend className="sr-only">Mise en vente</legend>
            <p className="heading text-[1rem]">Mise en vente</p>
            <PublishChoice
              checked={draft.publish}
              onSelect={() => state.update({ publish: true })}
              title="En vente"
              detail="Visible sur votre site dès l’enregistrement."
            />
            <PublishChoice
              checked={!draft.publish}
              onSelect={() => state.update({ publish: false })}
              title="Brouillon"
              detail="Invisible sur le site, en attendant."
            />
            <AnimatePresence initial={false}>
              {draft.publish && problems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={glide}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 border-t border-line pt-3">
                    <span className="flex items-center gap-2 text-[0.8125rem] font-[600]">
                      <span aria-hidden className="size-2 rounded-full bg-accent" />
                      Avant la mise en vente
                    </span>
                    <ul className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
                      {problems.map((problem) => (
                        <li key={problem.slug}>{problem.message}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
          <AnimatePresence>
            {formError && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={glide}
                className="rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] font-semibold text-danger-ink"
              >
                {formError}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" variant="primary" size="lg" loading={save.isPending} className="w-full">
            {submitLabel}
          </Button>
        </aside>
      </div>
    </form>
  );
}

function PublishChoice({ checked, onSelect, title, detail }: { checked: boolean; onSelect: () => void; title: string; detail: string }) {
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
          transition={glide}
        />
      )}
      <input type="radio" name="publication" checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'relative mt-0.5 inline-flex size-[1.125rem] shrink-0 items-center justify-center rounded-full transition-shadow duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
          checked ? 'shadow-[inset_0_0_0_5px_var(--color-ink)]' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]',
        )}
      />
      <span className="relative flex flex-col">
        <span className="font-[600]">{title}</span>
        <span className="text-[0.8125rem] text-ink-2">{detail}</span>
      </span>
    </label>
  );
}

/** Amène la première erreur de la page à l'écran et place le curseur dans son champ. */
function revealFirstError() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]');
      if (!target) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      const input = target.matches('input, select, textarea')
        ? target
        : target.parentElement?.querySelector<HTMLElement>('input, select, textarea');
      input?.focus({ preventScroll: true });
    }),
  );
}
