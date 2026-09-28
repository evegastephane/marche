import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, Layers, Plus, SearchX } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useCollectionList, useCreateCollection } from '@/features/collections/api';
import { mediaSrc } from '@/features/media/api';
import { errorMessage } from '@/shared/api/client';
import { plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input } from '@/shared/ui/field';
import { glide, riseIn } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';

const searchSchema = z.object({ q: z.string().trim().max(100).optional().catch(undefined) });

export const Route = createFileRoute('/_app/collections/')({
  validateSearch: searchSchema,
  component: Catalogues,
});

function Catalogues() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const list = useCollectionList(q || undefined);
  const collections = list.data?.pages.flatMap((p) => p.items) ?? [];
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalogues"
        subtitle="Des sélections de produits, dans l’ordre de votre choix : chacune a sa page sur votre site."
        actions={
          <Button variant="primary" icon={<Plus strokeWidth={1.8} />} onClick={() => setCreating(true)}>
            Nouveau catalogue
          </Button>
        }
      />

      <motion.div variants={riseIn} className="flex justify-end">
        <SearchInput
          label="Rechercher un catalogue"
          placeholder="Nom du catalogue"
          value={q ?? ''}
          onChange={(value) => void navigate({ search: { q: value || undefined }, replace: true })}
          className="w-full md:w-72"
        />
      </motion.div>

      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : list.error ? (
          <div className="p-5">
            <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : collections.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`Aucun catalogue pour « ${q} »`}>
              Vérifiez l’orthographe, ou créez-le.
            </EmptyState>
          ) : (
            <EmptyState icon={Layers} title="Pas encore de catalogue">
              Nouveautés, Soldes, Tenues de fête… Un catalogue regroupe des produits ; vous pourrez en mettre un en avant
              sur l’accueil de votre site.
            </EmptyState>
          )
        ) : (
          <ul className="divide-y divide-line">
            {collections.map((collection, index) => (
              <motion.li
                key={collection.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...glide, delay: Math.min(index, 12) * 0.025 }}
              >
                <Link
                  to="/collections/$collectionId"
                  params={{ collectionId: collection.id }}
                  className="group flex items-center gap-4 px-5 py-3.5 text-ink no-underline transition-colors duration-200 hover:bg-surface-2"
                >
                  <span className="well inline-flex aspect-[4/3] w-16 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] text-ink-3">
                    {collection.image ? (
                      <img src={mediaSrc(collection.image)} alt="" className="size-full object-cover" />
                    ) : (
                      <Layers className="size-5" strokeWidth={1.6} aria-hidden />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-[600]">{collection.title}</span>
                    <span className="text-[0.8125rem] text-ink-2">
                      {collection.productsCount > 0
                        ? plural(collection.productsCount, 'produit', 'produits')
                        : 'Vide pour l’instant'}
                    </span>
                  </span>
                  <Badge tone={collection.isPublished ? 'on' : 'off'} className="max-sm:hidden">
                    {collection.isPublished ? 'Visible sur le site' : 'Masqué'}
                  </Badge>
                  <ChevronRight
                    className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </Link>
              </motion.li>
            ))}
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
          Voir plus de catalogues
        </Button>
      )}

      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="Nouveau catalogue"
        description="Donnez-lui un nom ; vous ajouterez ses produits juste après."
      >
        {creating && <CreateForm onDone={() => setCreating(false)} />}
      </Dialog>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCollection();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          setError('Donnez un nom au catalogue.');
          return;
        }
        create.mutate(
          { title: title.trim(), isPublished: true },
          {
            onSuccess: (collection) => {
              onDone();
              void navigate({ to: '/collections/$collectionId', params: { collectionId: collection.id } });
            },
            onError: (err) => toast.error(errorMessage(err)),
          },
        );
      }}
    >
      <Field label="Nom" error={error}>
        {(props) => (
          <Input
            {...props}
            autoFocus
            value={title}
            maxLength={120}
            placeholder="Nouveautés"
            onChange={(e) => {
              setTitle(e.target.value);
              setError(undefined);
            }}
          />
        )}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending}>
          Créer le catalogue
        </Button>
      </div>
    </form>
  );
}
