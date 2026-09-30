import {
  ATTRIBUTE_TYPE_LABELS,
  type CategoryAttributeDto,
  type CategoryDetailDto,
  type CategoryDto,
  categoryDescendants,
} from '@marche/contracts';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, FolderTree, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Select } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';
import {
  flattenTree,
  useAttributes,
  useCategories,
  useCategory,
  useCategoryArchive,
  useInstallTemplate,
  useSetCategoryAttributes,
  useUpdateCategory,
} from './api';
import { AttributeDialog, ParentSelect, SwitchRow } from './dialogs';

export function CategoriesView({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const categories = useCategories(true);
  const install = useInstallTemplate();

  if (categories.error) return <LoadError message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />;
  if (!categories.data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  const rows = flattenTree(categories.data);
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          action={
            <Button
              variant="primary"
              loading={install.isPending}
              onClick={() =>
                install.mutate(undefined, {
                  onSuccess: (result) => toast('Catégories installées', { description: `${result.categories} catégories, ${result.attributes} attributs.` }),
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
            >
              Installer les catégories par défaut
            </Button>
          }
        >
          Les catégories rangent le catalogue et décident des champs de chaque produit. Partez de l’arbre par défaut de votre type de
          boutique, puis adaptez-le.
        </EmptyState>
      </Card>
    );
  }
  const selected = rows.find((row) => row.category.id === selectedId)?.category ?? rows[0]?.category;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="overflow-hidden lg:sticky lg:top-6">
        <CardHeader title="Arbre" count={categories.data.filter((c) => !c.archived).length} />
        <nav aria-label="Catégories" className="flex max-h-[70dvh] flex-col gap-0.5 overflow-y-auto px-2 pb-3">
          {rows.map(({ category, depth }) => {
            const active = category.id === selected?.id;
            return (
              <button
                key={category.id}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(category.id)}
                style={{ paddingLeft: `${0.75 + depth * 1.05}rem` }}
                className={cn(
                  'relative flex min-h-9 items-center justify-between gap-3 rounded-[0.7rem] py-1.5 pr-3 text-left text-[0.875rem] transition-colors max-md:min-h-11',
                  active ? 'text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  category.archived && 'opacity-55',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="category-row"
                    transition={glide}
                    className="absolute inset-0 rounded-[0.7rem] bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                  />
                )}
                <span className={cn('relative truncate', depth === 0 ? 'font-[650]' : 'font-[540]')}>{category.name}</span>
                <span className="relative flex shrink-0 items-center gap-2 text-[0.75rem] text-ink-3">
                  {category.tracksUnits && <span className="legend">IMEI</span>}
                  <span className="tabular">{category.productsCount || ''}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </Card>
      {selected && <CategoryEditor key={selected.id} id={selected.id} categories={categories.data} onSelect={onSelect} />}
    </div>
  );
}

function CategoryEditor({ id, categories, onSelect }: { id: string; categories: CategoryDto[]; onSelect: (id: string) => void }) {
  const detail = useCategory(id);
  if (detail.error) return <LoadError message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />;
  if (!detail.data) return <Skeleton className="h-96" />;
  return <CategoryEditorBody key={detail.data.updatedAt} detail={detail.data} categories={categories} onSelect={onSelect} />;
}

function CategoryEditorBody({
  detail,
  categories,
  onSelect,
}: {
  detail: CategoryDetailDto;
  categories: CategoryDto[];
  onSelect: (id: string) => void;
}) {
  const update = useUpdateCategory();
  const archive = useCategoryArchive();
  const [name, setName] = useState(detail.name);
  const [parentId, setParentId] = useState(detail.parentId ?? '');
  const dirty = name.trim() !== detail.name || parentId !== (detail.parentId ?? '');
  const siblings = categories
    .filter((c) => c.parentId === detail.parentId && !c.archived)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));
  const index = siblings.findIndex((c) => c.id === detail.id);
  const parentTracks = detail.tracksUnitsEffective && !detail.tracksUnits;

  const patch = (input: Parameters<typeof update.mutate>[0]['input'], done?: string) =>
    update.mutate(
      { id: detail.id, input },
      { onSuccess: () => done && toast(done), onError: (error) => toast.error(errorMessage(error)) },
    );

  /** Échange la place avec la voisine : positions renumérotées pour tout le niveau. */
  const move = (offset: -1 | 1) => {
    const order = siblings.map((c) => c.id);
    const target = index + offset;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target] as string, order[index] as string];
    order.forEach((categoryId, position) => {
      const current = siblings.find((c) => c.id === categoryId);
      if (current && current.position !== position) update.mutate({ id: categoryId, input: { position } });
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="legend truncate">{detail.path.slice(0, -1).map((step) => step.name).join(' › ') || 'Catégorie principale'}</span>
            <h2 className="heading flex items-center gap-2.5 text-[1.375rem]">
              {detail.name}
              {detail.archived && <Badge tone="off">Archivée</Badge>}
            </h2>
            <span className="text-[0.875rem] text-ink-2">
              {plural(detail.productsCount, 'produit', 'produits')} rangés ici directement
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" icon={<ArrowUp />} disabled={index <= 0} onClick={() => move(-1)} aria-label="Monter">
              <span className="max-sm:sr-only">Monter</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<ArrowDown />}
              disabled={index < 0 || index >= siblings.length - 1}
              onClick={() => move(1)}
              aria-label="Descendre"
            >
              <span className="max-sm:sr-only">Descendre</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={detail.archived ? <ArchiveRestore /> : <Archive />}
              loading={archive.isPending}
              onClick={() =>
                archive.mutate(
                  { id: detail.id, archived: !detail.archived },
                  {
                    onSuccess: () => toast(detail.archived ? 'Catégorie restaurée' : 'Catégorie archivée', { description: detail.name }),
                    onError: (error) => toast.error(errorMessage(error)),
                  },
                )
              }
            >
              {detail.archived ? 'Restaurer' : 'Archiver'}
            </Button>
          </div>
        </div>
        <form
          className="flex flex-col gap-5 border-t border-line px-5 pt-5 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            patch({ name: name.trim(), parentId: parentId || null }, 'Catégorie enregistrée');
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom">{(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label="Dans">
              {(props) => (
                <ParentSelect
                  {...props}
                  categories={categories}
                  value={parentId}
                  onChange={setParentId}
                  exclude={categoryDescendants(detail.id, categories)}
                />
              )}
            </Field>
          </div>
          <SwitchRow
            checked={detail.tracksUnitsEffective}
            disabled={parentTracks}
            onChange={(tracksUnits) => patch({ tracksUnits }, tracksUnits ? 'Suivi à l’unité activé' : 'Suivi à l’unité désactivé')}
            title="Suivi à l’unité"
            detail={
              parentTracks
                ? 'Hérité de la catégorie parente : chaque article a son IMEI.'
                : 'Chaque article a son IMEI ou numéro de série ; le stock se compte par unité.'
            }
          />
          <AnimatePresence initial={false}>
            {dirty && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={glide} className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName(detail.name);
                    setParentId(detail.parentId ?? '');
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

      <CategoryAttributes detail={detail} />

      {categories.some((c) => c.parentId === detail.id) && (
        <Card>
          <CardHeader title="Sous-catégories" />
          <div className="flex flex-wrap gap-1.5 px-5 pb-5">
            {categories
              .filter((c) => c.parentId === detail.id)
              .map((child) => (
                <Button key={child.id} size="sm" variant="secondary" onClick={() => onSelect(child.id)}>
                  {child.name}
                </Button>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function typeLabel(attribute: Pick<CategoryAttributeDto, 'type' | 'unit' | 'isVariantAxis'>): string {
  if (attribute.isVariantAxis) return 'Axe de variante';
  return `${ATTRIBUTE_TYPE_LABELS[attribute.type]}${attribute.unit ? ` · ${attribute.unit}` : ''}`;
}

/** Attributs de la catégorie : hérités en lecture seule, propres modifiables (obligatoire, ordre, retrait). */
function CategoryAttributes({ detail }: { detail: CategoryDetailDto }) {
  const all = useAttributes();
  const save = useSetCategoryAttributes();
  const [creating, setCreating] = useState(false);
  const inherited = detail.attributes.filter((a) => a.inherited);
  const own = detail.attributes.filter((a) => !a.inherited);
  const available = (all.data ?? []).filter((a) => !a.archived && !detail.attributes.some((linked) => linked.id === a.id));

  const put = (links: { attributeId: string; required: boolean }[]) =>
    save.mutate({ id: detail.id, input: { attributes: links } }, { onError: (error) => toast.error(errorMessage(error)) });
  const links = own.map((a) => ({ attributeId: a.id, required: a.required }));

  return (
    <Card>
      <CardHeader
        title="Attributs"
        count={detail.attributes.length}
        actions={
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setCreating(true)}>
            Créer un attribut
          </Button>
        }
      />
      <div className="flex flex-col gap-5 px-5 pb-6">
        {inherited.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="legend">Hérités</span>
            <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
              {inherited.map((attribute) => (
                <li key={attribute.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-[600]">{attribute.name}</span>
                    <span className="text-[0.8125rem] text-ink-2">
                      {typeLabel(attribute)} · de {attribute.source.name}
                    </span>
                  </span>
                  {attribute.required && <span className="legend">obligatoire</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="legend">Propres à {detail.name}</span>
          {own.length === 0 ? (
            <p className="text-[0.9375rem] text-ink-2">Aucun pour l’instant : ajoutez un attribut existant ou créez-en un.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
              {own.map((attribute, i) => (
                <li key={attribute.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-[600]">{attribute.name}</span>
                    <span className="text-[0.8125rem] text-ink-2">
                      {typeLabel(attribute)}
                      {attribute.values.length > 0 && ` · ${plural(attribute.values.length, 'valeur', 'valeurs')}`}
                    </span>
                  </span>
                  <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] font-[560] text-ink-2">
                    <Switch
                      checked={attribute.required}
                      onChange={(required) => put(links.map((link) => (link.attributeId === attribute.id ? { ...link, required } : link)))}
                    />
                    Obligatoire
                  </label>
                  <span className="flex items-center">
                    <IconKey label={`Monter ${attribute.name}`} disabled={i === 0} onClick={() => put(swap(links, i, i - 1))}>
                      <ArrowUp />
                    </IconKey>
                    <IconKey label={`Descendre ${attribute.name}`} disabled={i === own.length - 1} onClick={() => put(swap(links, i, i + 1))}>
                      <ArrowDown />
                    </IconKey>
                    <IconKey label={`Retirer ${attribute.name}`} onClick={() => put(links.filter((link) => link.attributeId !== attribute.id))}>
                      <X />
                    </IconKey>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {available.length > 0 && (
            <Select
              aria-label="Ajouter un attribut existant"
              value=""
              disabled={save.isPending}
              onChange={(event) => event.target.value && put([...links, { attributeId: event.target.value, required: false }])}
              className="sm:max-w-sm"
            >
              <option value="">Ajouter un attribut existant…</option>
              {available.map((attribute) => (
                <option key={attribute.id} value={attribute.id}>
                  {attribute.name} ({typeLabel(attribute)})
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>
      <AttributeDialog open={creating} onOpenChange={setCreating} categoryId={detail.id} categoryName={detail.name} />
    </Card>
  );
}

function swap<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  [next[from], next[to]] = [next[to] as T, next[from] as T];
  return next;
}

export function IconKey({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35 max-md:size-10 [&_svg]:size-4 [&_svg]:stroke-[1.8]"
    >
      {children}
    </button>
  );
}
