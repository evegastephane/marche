import {
  ATTRIBUTE_TYPE_LABELS,
  ATTRIBUTE_TYPES,
  type AttributeDto,
  type AttributeType,
  type CategoryDetailDto,
  type CategoryDto,
} from '@marche/contracts';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import { flattenTree, useCreateAttribute, useCreateCategory } from './api';

/** Ligne à interrupteur : tout le libellé est cliquable. */
export function SwitchRow({
  checked,
  onChange,
  title,
  detail,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  detail?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`well flex items-start gap-3 rounded-xl px-4 py-3 ${disabled ? 'opacity-55' : 'cursor-pointer'}`}>
      <Switch checked={checked} onChange={disabled ? () => undefined : onChange} />
      <span className="flex flex-col">
        <span className="font-[600]">{title}</span>
        {detail && <span className="text-[0.875rem] text-ink-2">{detail}</span>}
      </span>
    </label>
  );
}

/** Choix du parent : l'arbre en retrait, sans la catégorie elle-même ni ses descendantes. */
export function ParentSelect({
  categories,
  value,
  onChange,
  exclude = [],
  id,
  ...aria
}: {
  categories: readonly CategoryDto[];
  value: string;
  onChange: (parentId: string) => void;
  exclude?: readonly string[];
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  return (
    <Select id={id} {...aria} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Aucun (catégorie principale)</option>
      {flattenTree(categories.filter((c) => !c.archived && !exclude.includes(c.id))).map(({ category, depth }) => (
        <option key={category.id} value={category.id}>
          {`${' '.repeat(depth)}${category.name}`}
        </option>
      ))}
    </Select>
  );
}

export function CategoryDialog({
  open,
  onOpenChange,
  categories,
  defaultParentId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: readonly CategoryDto[];
  defaultParentId?: string;
  onCreated: (category: CategoryDetailDto) => void;
}) {
  const create = useCreateCategory();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(defaultParentId ?? '');
  const [tracksUnits, setTracksUnits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    create.mutate(
      { name, parentId: parentId || null, tracksUnits },
      {
        onSuccess: (category) => {
          toast('Catégorie créée', { description: category.path.map((step) => step.name).join(' › ') });
          setName('');
          setTracksUnits(false);
          onOpenChange(false);
          onCreated(category);
        },
        onError: (caught) => setError(caught instanceof ApiError ? (caught.fieldErrors.name ?? caught.message) : errorMessage(caught)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Nouvelle catégorie" description="Rangez-la sous une autre pour qu’elle hérite de ses attributs.">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Nom" error={error ?? undefined}>
          {(props) => <Input {...props} autoFocus value={name} placeholder="Montres connectées" onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Dans">
          {(props) => <ParentSelect {...props} categories={categories} value={parentId} onChange={setParentId} />}
        </Field>
        <SwitchRow
          checked={tracksUnits}
          onChange={setTracksUnits}
          title="Suivi à l’unité"
          detail="Chaque article a son IMEI ou numéro de série. Les sous-catégories suivent."
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending} disabled={!name.trim()}>
            Créer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const VALUE_TYPES: readonly AttributeType[] = ['SELECT', 'MULTI_SELECT'];

export function AttributeDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Création depuis une catégorie : l'attribut y est rattaché tout de suite. */
  categoryId?: string;
  categoryName?: string;
  onCreated?: (attribute: AttributeDto) => void;
}) {
  const create = useCreateAttribute();
  const [name, setName] = useState('');
  const [type, setType] = useState<AttributeType>('SELECT');
  const [unit, setUnit] = useState('');
  const [isVariantAxis, setIsVariantAxis] = useState(false);
  const [filterable, setFilterable] = useState(true);
  const [required, setRequired] = useState(false);
  const [values, setValues] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName('');
    setType('SELECT');
    setUnit('');
    setIsVariantAxis(false);
    setFilterable(true);
    setRequired(false);
    setValues('');
    setErrors({});
  };

  const submit = () => {
    setErrors({});
    const list = VALUE_TYPES.includes(type)
      ? [...new Set(values.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean))].map((value) => ({ value }))
      : [];
    create.mutate(
      {
        name,
        type,
        unit: type === 'NUMBER' ? unit.trim() || null : null,
        isVariantAxis: type === 'SELECT' && isVariantAxis,
        filterable,
        values: list,
        categoryId,
        required,
      },
      {
        onSuccess: (attribute) => {
          toast('Attribut créé', { description: categoryName ? `${attribute.name}, dans ${categoryName}` : attribute.name });
          reset();
          onOpenChange(false);
          onCreated?.(attribute);
        },
        onError: (caught) =>
          setErrors(caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0 ? caught.fieldErrors : { form: errorMessage(caught) }),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvel attribut"
      description={categoryName ? `Il sera proposé dans ${categoryName} et ses sous-catégories.` : 'Rattachez-le ensuite à une ou plusieurs catégories.'}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom" error={errors.name}>
            {(props) => <Input {...props} autoFocus value={name} placeholder="Puissance" onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Type" error={errors.type}>
            {(props) => (
              <Select {...props} value={type} onChange={(e) => setType(e.target.value as AttributeType)}>
                {ATTRIBUTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ATTRIBUTE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {type === 'NUMBER' && (
          <Field label="Unité" hint="W, mAh, h, pouces…" error={errors.unit}>
            {(props) => <Input {...props} className="max-w-40" value={unit} onChange={(e) => setUnit(e.target.value)} />}
          </Field>
        )}
        {VALUE_TYPES.includes(type) && (
          <Field label="Valeurs" hint="Une par ligne ou séparées par des virgules ; d’autres s’ajoutent plus tard." error={errors.values}>
            {(props) => <Textarea {...props} className="min-h-24" value={values} placeholder={'20 W\n30 W\n45 W'} onChange={(e) => setValues(e.target.value)} />}
          </Field>
        )}
        {type === 'SELECT' && (
          <SwitchRow
            checked={isVariantAxis}
            onChange={setIsVariantAxis}
            title="Axe de variante"
            detail="Chaque valeur a son prix, son stock et son SKU (stockage, couleur, état…)."
          />
        )}
        <SwitchRow checked={filterable} onChange={setFilterable} title="Filtre du site" detail="Les clients filtrent le rayon par cet attribut." />
        {categoryId && (
          <SwitchRow checked={required} onChange={setRequired} title="Obligatoire" detail="Un produit ne se met pas en vente sans lui." />
        )}
        {(errors.form ?? errors.isVariantAxis) && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] font-[560] text-danger-ink">
            {errors.form ?? errors.isVariantAxis}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending} disabled={!name.trim()}>
            Créer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
