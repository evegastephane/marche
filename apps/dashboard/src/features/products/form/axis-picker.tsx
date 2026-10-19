import { canonicalValue, type CategoryAttributeDto } from '@marche/contracts';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/field';
import { useAddAttributeValues } from '../../categories/api';
import { axesOf, type Attributes, type DraftErrors } from '../model/product-draft';
import { ValueChip } from './value-chip';

/** Axes de variante de la catégorie : on coche les valeurs vendues, les combinaisons suivent. */
export function AxisPicker({
  attributes,
  picked,
  errors,
  onToggle,
  onAdded,
}: {
  attributes: Attributes;
  picked: Record<string, string[]>;
  errors: DraftErrors;
  onToggle: (slug: string, value: string, on: boolean) => void;
  /** Valeur créée sur l'attribut : la cocher une fois l'attribut relu. */
  onAdded: (slug: string, value: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const axes = axesOf(attributes);
  if (axes.length === 0) return null;
  const errorOf = (axis: CategoryAttributeDto) => errors[`axes.${axis.slug}`] ?? errors[`specs.${axis.slug}`];
  const required = axes.filter((axis) => axis.required);
  const optional = axes.filter((axis) => !axis.required);
  // Les axes facultatifs restent repliés tant qu'ils ne servent pas : ils s'ouvrent seuls dès qu'une
  // valeur est cochée (produit existant, fiche préremplie) ou qu'une erreur les concerne.
  const inUse = optional.some((axis) => (picked[axis.slug]?.length ?? 0) > 0 || errorOf(axis));
  const shown = expanded || inUse || required.length === 0 ? axes : required;
  const row = (axis: CategoryAttributeDto) => (
    <AxisRow
      key={axis.id}
      axis={axis}
      picked={picked[axis.slug] ?? []}
      error={errorOf(axis)}
      onToggle={(value, on) => onToggle(axis.slug, value, on)}
      onAdded={(value) => onAdded(axis.slug, value)}
    />
  );
  return (
    <div className="flex flex-col gap-5">
      {shown.map(row)}
      {shown.length < axes.length && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-11 items-center gap-2 self-start rounded-[0.7rem] px-3 text-left text-[0.875rem] font-[600] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Plus className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          <span>
            Autres variantes{' '}
            <span className="font-[500] text-ink-3">· {optional.map((axis) => axis.name).join(', ')}</span>
          </span>
        </button>
      )}
    </div>
  );
}

function AxisRow({
  axis,
  picked,
  error,
  onToggle,
  onAdded,
}: {
  axis: CategoryAttributeDto;
  picked: string[];
  error?: string;
  onToggle: (value: string, on: boolean) => void;
  onAdded: (value: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const add = useAddAttributeValues();

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setFailure(null);
    const known = canonicalValue(axis, value);
    if (known) {
      if (!picked.includes(known)) onToggle(known, true);
    } else {
      try {
        await add.mutateAsync({ id: axis.id, values: [{ value }] });
        await onAdded(value);
      } catch (caught) {
        setFailure(errorMessage(caught));
        return;
      }
    }
    setText('');
  };

  const count = picked.filter((value) => axis.values.some((candidate) => candidate.value === value)).length;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 flex items-baseline gap-2 text-[0.8125rem] font-[600] text-ink">
        {axis.name}
        {axis.required && <span className="legend">obligatoire</span>}
        <span className="tabular font-[500] text-ink-3">
          {count} / {axis.values.length}
        </span>
      </legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {axis.values.map((option) => (
          <ValueChip
            key={option.value}
            pressed={picked.includes(option.value)}
            swatch={option.swatch ?? (axis.values.some((v) => v.swatch) ? null : undefined)}
            onToggle={(on) => onToggle(option.value, on)}
          >
            {option.value}
          </ValueChip>
        ))}
        {adding ? (
          <span className="inline-flex items-center gap-1.5">
            <Input
              autoFocus
              aria-label={`Nouvelle valeur : ${axis.name}`}
              className="h-8 w-40 text-[0.8125rem] max-md:h-10"
              value={text}
              placeholder={axis.values[0]?.value ?? 'Valeur'}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
                if (event.key === 'Escape') setAdding(false);
              }}
            />
            <Button size="sm" variant="secondary" loading={add.isPending} onClick={() => void submit()}>
              Ajouter
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setAdding(true)}>
            Valeur
          </Button>
        )}
      </div>
      {(failure ?? error) && (
        <span data-field-error className="text-[0.8125rem] font-[560] text-danger-ink">
          {failure ?? error}
        </span>
      )}
    </fieldset>
  );
}
