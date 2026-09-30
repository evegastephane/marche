import { ATTRIBUTE_TYPE_LABELS, type AttributeDto, type AttributeValueDto } from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ListTree, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Input } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { Swatch } from '../products/form/swatch';
import {
  useAddAttributeValues,
  useAttributeArchive,
  useAttributes,
  useDeleteAttributeValue,
  useReorderAttributeValues,
  useUpdateAttribute,
  useUpdateAttributeValue,
} from './api';
import { IconKey } from './categories-view';
import { SwitchRow } from './dialogs';

function describe(attribute: AttributeDto): string {
  const type = attribute.isVariantAxis ? 'Axe de variante' : ATTRIBUTE_TYPE_LABELS[attribute.type];
  return [type, attribute.unit, attribute.values.length > 0 ? plural(attribute.values.length, 'valeur', 'valeurs') : null]
    .filter(Boolean)
    .join(' · ');
}

export function AttributesView({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const attributes = useAttributes(true);
  const [query, setQuery] = useState('');
  const needle = useDeferredValue(query.trim().toLowerCase());

  if (attributes.error) return <LoadError message={errorMessage(attributes.error)} onRetry={() => void attributes.refetch()} />;
  if (!attributes.data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (attributes.data.length === 0) {
    return (
      <Card>
        <EmptyState icon={ListTree} title="Aucun attribut">
          Un attribut décrit un produit (puissance, matière) ou le fait varier (stockage, couleur, taille).
        </EmptyState>
      </Card>
    );
  }
  const shown = attributes.data.filter(
    (a) => !needle || a.name.toLowerCase().includes(needle) || a.categories.some((c) => c.name.toLowerCase().includes(needle)),
  );
  const selected = attributes.data.find((a) => a.id === selectedId) ?? shown[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="overflow-hidden lg:sticky lg:top-6">
        <div className="px-3 pt-3 pb-2">
          <SearchInput label="Chercher un attribut" placeholder="Couleur, puissance…" value={query} onChange={setQuery} />
        </div>
        <nav aria-label="Attributs" className="flex max-h-[68dvh] flex-col gap-0.5 overflow-y-auto px-2 pb-3">
          {shown.map((attribute) => {
            const active = attribute.id === selected?.id;
            return (
              <button
                key={attribute.id}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(attribute.id)}
                className={cn(
                  'relative flex flex-col rounded-[0.7rem] px-3 py-2 text-left transition-colors',
                  active ? 'text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  attribute.archived && 'opacity-55',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="attribute-row"
                    transition={glide}
                    className="absolute inset-0 rounded-[0.7rem] bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                  />
                )}
                <span className="relative text-[0.9375rem] font-[600]">{attribute.name}</span>
                <span className="relative truncate text-[0.8125rem] text-ink-3">{describe(attribute)}</span>
              </button>
            );
          })}
          {shown.length === 0 && <p className="px-3 py-4 text-[0.875rem] text-ink-2">Aucun attribut pour « {query.trim()} ».</p>}
        </nav>
      </Card>
      {selected && <AttributeEditor key={`${selected.id}-${selected.updatedAt}`} attribute={selected} />}
    </div>
  );
}

function AttributeEditor({ attribute }: { attribute: AttributeDto }) {
  const update = useUpdateAttribute();
  const archive = useAttributeArchive();
  const [name, setName] = useState(attribute.name);
  const [unit, setUnit] = useState(attribute.unit ?? '');
  const dirty = name.trim() !== attribute.name || (attribute.type === 'NUMBER' && unit.trim() !== (attribute.unit ?? ''));
  const hasValues = attribute.type === 'SELECT' || attribute.type === 'MULTI_SELECT';

  const patch = (input: Parameters<typeof update.mutate>[0]['input'], done: string) =>
    update.mutate({ id: attribute.id, input }, { onSuccess: () => toast(done), onError: (error) => toast.error(errorMessage(error)) });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="legend">{describe(attribute)}</span>
            <h2 className="heading flex items-center gap-2.5 text-[1.375rem]">
              {attribute.name}
              {attribute.archived && <Badge tone="off">Archivé</Badge>}
            </h2>
            <span className="text-[0.8125rem] text-ink-2">
              Clé dans l’API : <code className="tabular text-ink">{attribute.slug}</code>
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={attribute.archived ? <ArchiveRestore /> : <Archive />}
            loading={archive.isPending}
            onClick={() =>
              archive.mutate(
                { id: attribute.id, archived: !attribute.archived },
                {
                  onSuccess: () => toast(attribute.archived ? 'Attribut restauré' : 'Attribut archivé', { description: attribute.name }),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          >
            {attribute.archived ? 'Restaurer' : 'Archiver'}
          </Button>
        </div>
        <form
          className="flex flex-col gap-5 border-t border-line px-5 pt-5 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            patch({ name: name.trim(), ...(attribute.type === 'NUMBER' && { unit: unit.trim() || null }) }, 'Attribut enregistré');
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom">{(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            {attribute.type === 'NUMBER' && (
              <Field label="Unité">{(props) => <Input {...props} value={unit} onChange={(e) => setUnit(e.target.value)} />}</Field>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchRow
              checked={attribute.filterable}
              onChange={(filterable) => patch({ filterable }, filterable ? 'Filtre ajouté au site' : 'Filtre retiré du site')}
              title="Filtre du site"
              detail="Proposé dans les filtres du rayon."
            />
            {attribute.type === 'SELECT' && (
              <SwitchRow
                checked={attribute.isVariantAxis}
                onChange={(isVariantAxis) => patch({ isVariantAxis }, isVariantAxis ? 'Devenu axe de variante' : 'N’est plus un axe')}
                title="Axe de variante"
                detail="Figé dès qu’un produit l’utilise."
              />
            )}
          </div>
          <AnimatePresence initial={false}>
            {dirty && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={glide} className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName(attribute.name);
                    setUnit(attribute.unit ?? '');
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="primary" loading={update.isPending} disabled={!name.trim()}>
                  Enregistrer
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Card>

      {hasValues && <AttributeValues attribute={attribute} />}

      <Card>
        <CardHeader title="Proposé dans" count={attribute.categories.length} />
        <div className="flex flex-wrap gap-1.5 px-5 pb-5">
          {attribute.categories.length === 0 ? (
            <p className="text-[0.9375rem] text-ink-2">Aucune catégorie : rattachez-le depuis l’onglet Catégories.</p>
          ) : (
            attribute.categories.map((category) => (
              <Link
                key={category.id}
                to="/categories"
                search={{ id: category.id }}
                className="well inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-[0.8125rem] font-[560] text-ink no-underline hover:bg-surface-2 max-md:h-10"
              >
                {category.name}
                {category.required && <span className="legend">obligatoire</span>}
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

/** Valeurs d'une liste : libellé, code SKU, pastille ; ordre et retrait. */
function AttributeValues({ attribute }: { attribute: AttributeDto }) {
  const add = useAddAttributeValues();
  const reorder = useReorderAttributeValues();
  const [text, setText] = useState('');
  const values = attribute.values;
  const showSwatch = attribute.slug === 'couleur' || values.some((v) => v.swatch);

  const submit = () => {
    const list = [...new Set(text.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean))];
    if (list.length === 0) return;
    add.mutate(
      { id: attribute.id, values: list.map((value) => ({ value })) },
      { onSuccess: () => setText(''), onError: (error) => toast.error(errorMessage(error)) },
    );
  };
  const move = (from: number, to: number) => {
    const ids = values.map((v) => v.id);
    [ids[from], ids[to]] = [ids[to] as string, ids[from] as string];
    reorder.mutate({ id: attribute.id, valueIds: ids }, { onError: (error) => toast.error(errorMessage(error)) });
  };

  return (
    <Card>
      <CardHeader title="Valeurs" count={values.length} />
      <div className="flex flex-col gap-4 px-5 pb-6">
        {values.length > 0 && (
          <>
            <div aria-hidden className="legend hidden grid-cols-[minmax(0,1fr)_7rem_6.5rem] gap-3 px-3 sm:grid">
              <span>Valeur</span>
              <span>Code SKU</span>
              <span />
            </div>
            <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
              {values.map((value, i) => (
                <ValueRow
                  key={`${value.id}-${value.value}-${value.code}-${value.swatch ?? ''}`}
                  attributeId={attribute.id}
                  value={value}
                  showSwatch={showSwatch}
                  first={i === 0}
                  last={i === values.length - 1}
                  onMove={(offset) => move(i, i + offset)}
                />
              ))}
            </ul>
          </>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Ajouter des valeurs" hint="Séparées par des virgules." className="min-w-0 flex-1">
            {(props) => (
              <Input
                {...props}
                value={text}
                placeholder="Bleu nuit, Titane naturel"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
            )}
          </Field>
          <Button variant="secondary" icon={<Plus />} loading={add.isPending} disabled={!text.trim()} onClick={submit} className="mb-[1.6rem]">
            Ajouter
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ValueRow({
  attributeId,
  value,
  showSwatch,
  first,
  last,
  onMove,
}: {
  attributeId: string;
  value: AttributeValueDto;
  showSwatch: boolean;
  first: boolean;
  last: boolean;
  onMove: (offset: -1 | 1) => void;
}) {
  const update = useUpdateAttributeValue();
  const remove = useDeleteAttributeValue();
  const [label, setLabel] = useState(value.value);
  const [code, setCode] = useState(value.code);

  const commit = (input: { value?: string; code?: string; swatch?: string | null }) =>
    update.mutate({ id: attributeId, valueId: value.id, input }, { onError: (error) => toast.error(errorMessage(error)) });

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_6.5rem]">
      <span className="flex min-w-0 items-center gap-2">
        {showSwatch && (
          <label className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-surface-2" title="Pastille">
            <Swatch hex={value.swatch} className="size-4" />
            <input
              type="color"
              aria-label={`Pastille de ${value.value}`}
              value={value.swatch ?? '#888888'}
              onChange={(event) => commit({ swatch: event.target.value.toUpperCase() })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        )}
        <Input
          aria-label={`Valeur ${value.value}`}
          className="h-9"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label.trim() && label.trim() !== value.value && commit({ value: label.trim() })}
        />
      </span>
      <Input
        aria-label={`Code SKU de ${value.value}`}
        className="tabular h-9 uppercase max-sm:col-start-1 max-sm:row-start-2 max-sm:w-28"
        value={code}
        maxLength={16}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        onBlur={() => code && code !== value.code && commit({ code })}
      />
      <span className="flex items-center justify-end max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:flex-col">
        <IconKey label={`Monter ${value.value}`} disabled={first} onClick={() => onMove(-1)}>
          <ArrowUp />
        </IconKey>
        <IconKey label={`Descendre ${value.value}`} disabled={last} onClick={() => onMove(1)}>
          <ArrowDown />
        </IconKey>
        <IconKey
          label={`Supprimer ${value.value}`}
          onClick={() => remove.mutate({ id: attributeId, valueId: value.id }, { onError: (error) => toast.error(errorMessage(error)) })}
        >
          <X />
        </IconKey>
      </span>
    </li>
  );
}
