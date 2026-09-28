import type { CollectionDetailDto, MediaDto, ProductListItemDto } from '@marche/contracts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, GripVertical, Layers, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCollection, useDeleteCollection, useSaveCollection } from '@/features/collections/api';
import { SingleImage } from '@/features/media/media-gallery';
import { ProductPicker } from '@/features/products/product-picker';
import { PRODUCT_STATUS } from '@/features/products/status';
import { Thumbnail } from '@/features/products/thumbnail';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney, plural } from '@/shared/lib/format';
import { Badge, Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { glide, riseIn } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';

export const Route = createFileRoute('/_app/collections/$collectionId')({ component: CatalogueDetail });

function CatalogueDetail() {
  const { collectionId } = Route.useParams();
  const collection = useCollection(collectionId);
  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link
          to="/collections"
          className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Catalogues
        </Link>
      </motion.div>
      {collection.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-80" />
        </div>
      ) : collection.error ? (
        collection.error instanceof ApiError && collection.error.code === 'NOT_FOUND' ? (
          <div className="panel">
            <EmptyState icon={Layers} title="Catalogue introuvable">
              Il a peut-être été supprimé.
            </EmptyState>
          </div>
        ) : (
          <LoadError message={errorMessage(collection.error)} onRetry={() => void collection.refetch()} />
        )
      ) : (
        <Editor key={collection.data.updatedAt} collection={collection.data} />
      )}
    </div>
  );
}

/**
 * Éditeur d'un catalogue : réglages à gauche, produits à droite.
 * Les produits se réordonnent en les faisant glisser par leur poignée (ou avec les flèches du clavier) ;
 * rien ne part avant « Enregistrer », et la touche s'allume dès qu'il y a quelque chose à enregistrer.
 */
function Editor({ collection }: { collection: CollectionDetailDto }) {
  const save = useSaveCollection(collection.id);
  const store = useCurrentStore();
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description ?? '');
  const [published, setPublished] = useState(collection.isPublished);
  const [image, setImage] = useState<MediaDto | null>(collection.image);
  const [products, setProducts] = useState<ProductListItemDto[]>(collection.products);
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fields = {
    ...(title.trim() !== collection.title && { title: title.trim() }),
    ...((description.trim() || null) !== collection.description && { description: description.trim() || null }),
    ...(published !== collection.isPublished && { isPublished: published }),
    ...((image?.id ?? null) !== (collection.image?.id ?? null) && { imageMediaId: image?.id ?? null }),
  };
  const orderChanged =
    products.length !== collection.products.length || products.some((p, i) => p.id !== collection.products[i]?.id);
  const dirty = Object.keys(fields).length > 0 || orderChanged;

  const submit = () => {
    if (!title.trim()) {
      toast.error('Donnez un nom au catalogue.');
      return;
    }
    save.mutate(
      { fields, productIds: orderChanged ? products.map((p) => p.id) : undefined },
      {
        onSuccess: () => toast('Catalogue enregistré', { description: title.trim() }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  const move = (index: number, delta: number) =>
    setProducts((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (item) next.splice(index + delta, 0, item);
      return next;
    });

  return (
    <>
      <motion.header variants={riseIn} className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="display text-[1.875rem] break-words md:text-[2.25rem]">{title.trim() || 'Catalogue'}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.875rem] text-ink-2">
            <Badge tone={published ? 'on' : 'off'}>{published ? 'Visible sur le site' : 'Masqué'}</Badge>
            <span>{plural(products.length, 'produit', 'produits')}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" icon={<Trash2 strokeWidth={1.8} />} onClick={() => setDeleting(true)}>
            Supprimer
          </Button>
          <Button variant={dirty ? 'primary' : 'secondary'} disabled={!dirty} loading={save.isPending} onClick={submit}>
            Enregistrer
          </Button>
        </div>
      </motion.header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-8">
        <Card className="flex flex-col gap-5 p-5 lg:sticky lg:top-9">
          <Field label="Nom">
            {(props) => <Input {...props} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <Field label="Description (facultative)" hint="Affichée en haut de la page du catalogue.">
            {(props) => (
              <Textarea
                {...props}
                className="min-h-24"
                value={description}
                maxLength={5000}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <SingleImage label="Visuel" hint="Paysage, 1600 px de large idéalement." shape="wide" media={image} onChange={setImage} />
          <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
            <Switch checked={published} onChange={setPublished} />
            <span className="flex flex-col">
              <span className="font-[600]">Visible sur le site</span>
              <span className="text-[0.875rem] text-ink-2">Masqué, il reste ici mais disparaît du site.</span>
            </span>
          </label>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Produits"
            count={products.length}
            actions={
              <Button size="sm" variant="secondary" icon={<Plus strokeWidth={1.8} />} onClick={() => setPicking(true)}>
                Ajouter
              </Button>
            }
          />
          {products.length === 0 ? (
            <EmptyState icon={Layers} title="Catalogue vide">
              Ajoutez des produits : ils apparaîtront dans cet ordre sur la page du catalogue.
            </EmptyState>
          ) : (
            <Reorder.Group axis="y" values={products} onReorder={setProducts} className="border-t border-line" as="ol">
              <AnimatePresence initial={false}>
                {products.map((product, index) => (
                  <Row
                    key={product.id}
                    product={product}
                    index={index}
                    count={products.length}
                    currency={store.data?.currency ?? 'XOF'}
                    onMove={(delta) => move(index, delta)}
                    onRemove={() => setProducts((prev) => prev.filter((p) => p.id !== product.id))}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
          {products.length > 1 && (
            <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-[0.8125rem] text-ink-2">
              <Led tone={orderChanged ? 'attention' : 'off'} />
              {orderChanged ? 'Nouvel ordre à enregistrer.' : 'Glissez par la poignée pour changer l’ordre.'}
            </p>
          )}
        </Card>
      </div>

      <ProductPicker
        open={picking}
        onOpenChange={setPicking}
        exclude={new Set(products.map((p) => p.id))}
        onPick={(picked) => setProducts((prev) => [...prev, ...picked])}
      />
      <DeleteDialog open={deleting} onOpenChange={setDeleting} collection={collection} />
    </>
  );
}

function Row({
  product,
  index,
  count,
  currency,
  onMove,
  onRemove,
}: {
  product: ProductListItemDto;
  index: number;
  count: number;
  currency: 'XOF' | 'EUR' | 'USD' | 'GBP' | 'MAD' | 'XAF';
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={product}
      as="li"
      dragListener={false}
      dragControls={controls}
      transition={glide}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      whileDrag={{ scale: 1.01, boxShadow: '0 14px 30px -14px rgb(16 17 21 / 0.35)', zIndex: 5 }}
      className="relative flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 last:border-b-0 sm:px-4"
    >
      <button
        type="button"
        aria-label={`Déplacer ${product.title} (flèches haut et bas)`}
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' && index > 0) {
            event.preventDefault();
            onMove(-1);
          } else if (event.key === 'ArrowDown' && index < count - 1) {
            event.preventDefault();
            onMove(1);
          }
        }}
        className="inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="size-4" strokeWidth={1.8} />
      </button>
      <span className="tabular w-5 text-right text-[0.8125rem] text-ink-3">{index + 1}</span>
      <Thumbnail media={product.thumbnail} alt={product.title} className="size-11" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-[600]">{product.title}</span>
        <span className={cn('tabular text-[0.8125rem] text-ink-2')}>
          {formatMoney(product.priceMinAmount, currency)} · {PRODUCT_STATUS[product.status].label}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Retirer ${product.title} du catalogue`}
        onClick={onRemove}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <X className="size-4" strokeWidth={1.8} />
      </button>
    </Reorder.Item>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  collection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: CollectionDetailDto;
}) {
  const remove = useDeleteCollection();
  const navigate = useNavigate();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer le catalogue"
      description={`« ${collection.title} » disparaît du site. Ses produits restent en vente.`}
    >
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Garder
        </Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(collection.id, {
              onSuccess: () => {
                toast('Catalogue supprimé', { description: collection.title });
                void navigate({ to: '/collections' });
              },
              onError: (error) => toast.error(errorMessage(error)),
            })
          }
        >
          Supprimer
        </Button>
      </div>
    </Dialog>
  );
}
