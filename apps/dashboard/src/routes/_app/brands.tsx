import type { BrandDto, MediaDto } from '@marche/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { Archive, ArchiveRestore, Pencil, Plus, SearchX, Tag } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useBrandList, useBrandMutation } from '@/features/brands/api';
import { mediaSrc } from '@/features/media/api';
import { SingleImage } from '@/features/media/media-gallery';
import { ApiError, errorMessage } from '@/shared/api/client';
import { plural } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { EASE_OUT, glide, riseIn } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { Switch } from '@/shared/ui/switch';

const searchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  archived: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/brands')({
  validateSearch: searchSchema,
  component: Marques,
});

type Editing = { mode: 'create' } | { mode: 'edit'; brand: BrandDto } | null;

function Marques() {
  const { q, archived } = Route.useSearch();
  const navigate = Route.useNavigate();
  const list = useBrandList(q || undefined, Boolean(archived));
  const mutation = useBrandMutation();
  const brands = list.data?.pages.flatMap((p) => p.items) ?? [];
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggleArchive = (brand: BrandDto) => {
    setPendingId(brand.id);
    mutation.mutate(
      { type: brand.archivedAt ? 'restore' : 'archive', id: brand.id },
      {
        onSuccess: () => toast(brand.archivedAt ? 'Marque restaurée' : 'Marque archivée', { description: brand.name }),
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () => setPendingId(null),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marques"
        subtitle="Regroupez vos produits par marque : elles s’affichent sur les fiches produit de votre site."
        actions={
          <Button variant="primary" icon={<Plus strokeWidth={1.8} />} onClick={() => setEditing({ mode: 'create' })}>
            Nouvelle marque
          </Button>
        }
      />

      <motion.div variants={riseIn} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex cursor-pointer items-center gap-3 text-[0.875rem] font-[560] text-ink-2">
          <Switch
            checked={Boolean(archived)}
            onChange={(value) =>
              void navigate({ search: (prev) => ({ ...prev, archived: value || undefined }), replace: true })
            }
          />
          Afficher les marques archivées
        </label>
        <SearchInput
          label="Rechercher une marque"
          placeholder="Nom de la marque"
          value={q ?? ''}
          onChange={(value) => void navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
          className="md:w-72"
        />
      </motion.div>

      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.error ? (
          <div className="p-5">
            <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : brands.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`Aucune marque pour « ${q} »`}>
              Vérifiez l’orthographe, ou créez-la.
            </EmptyState>
          ) : (
            <EmptyState icon={Tag} title="Pas encore de marque">
              Une marque se crée en un nom ; ajoutez son logo si vous l’avez. Vous la choisirez ensuite sur chaque
              produit.
            </EmptyState>
          )
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {brands.map((brand, index) => (
                <motion.li
                  key={brand.id}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { ...glide, delay: Math.min(index, 12) * 0.025 } }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.2, ease: EASE_OUT } }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
                >
                  <Avatar
                    name={brand.name}
                    src={brand.logo ? mediaSrc(brand.logo) : null}
                    shape="square"
                    className="size-11 text-[0.8125rem]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-[600]">{brand.name}</span>
                    <span className="text-[0.8125rem] text-ink-2">
                      {brand.productsCount > 0 ? plural(brand.productsCount, 'produit', 'produits') : 'Aucun produit'}
                    </span>
                  </div>
                  {brand.archivedAt && <Badge tone="off">Archivée</Badge>}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil strokeWidth={1.8} />}
                      onClick={() => setEditing({ mode: 'edit', brand })}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={brand.archivedAt ? <ArchiveRestore strokeWidth={1.8} /> : <Archive strokeWidth={1.8} />}
                      loading={pendingId === brand.id}
                      onClick={() => toggleArchive(brand)}
                    >
                      <span className="max-sm:sr-only">{brand.archivedAt ? 'Restaurer' : 'Archiver'}</span>
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>

      {list.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          Voir plus de marques
        </Button>
      )}

      <BrandDialog editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function BrandDialog({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const brand = editing?.mode === 'edit' ? editing.brand : null;
  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(open) => !open && onClose()}
      title={brand ? 'Modifier la marque' : 'Nouvelle marque'}
    >
      {/* La clé remet le formulaire à zéro à chaque ouverture. */}
      {editing && <BrandForm key={brand?.id ?? 'nouvelle'} brand={brand} onDone={onClose} />}
    </Dialog>
  );
}

function BrandForm({ brand, onDone }: { brand: BrandDto | null; onDone: () => void }) {
  const mutation = useBrandMutation();
  const [name, setName] = useState(brand?.name ?? '');
  const [description, setDescription] = useState(brand?.description ?? '');
  const [logo, setLogo] = useState<MediaDto | null>(brand?.logo ?? null);
  const [error, setError] = useState<string>();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError('Donnez un nom à la marque.');
          return;
        }
        const input = { name: name.trim(), description: description.trim() || null, logoMediaId: logo?.id ?? null };
        mutation.mutate(brand ? { type: 'update', id: brand.id, input } : { type: 'create', input }, {
          onSuccess: (saved) => {
            toast(brand ? 'Marque enregistrée' : 'Marque créée', { description: saved.name });
            onDone();
          },
          onError: (err) =>
            err instanceof ApiError && (err.code === 'SLUG_TAKEN' || err.code === 'UNIQUE_VIOLATION')
              ? setError('Une marque porte déjà ce nom.')
              : toast.error(errorMessage(err)),
        });
      }}
    >
      <Field label="Nom" error={error}>
        {(props) => (
          <Input
            {...props}
            autoFocus
            value={name}
            maxLength={80}
            placeholder="Bazin d’Or"
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
          />
        )}
      </Field>
      <Field label="Description (facultative)">
        {(props) => (
          <Textarea
            {...props}
            className="min-h-20"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </Field>
      <SingleImage label="Logo" hint="Carré de préférence." media={logo} onChange={setLogo} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          {brand ? 'Enregistrer' : 'Créer la marque'}
        </Button>
      </div>
    </form>
  );
}
