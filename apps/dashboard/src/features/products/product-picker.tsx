import type { ProductListItemDto } from '@marche/contracts';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { LoadError, Skeleton } from '@/shared/ui/feedback';
import { SearchInput } from '@/shared/ui/search';
import { errorMessage } from '@/shared/api/client';
import { PRODUCT_STATUS } from './status';
import { Thumbnail } from './thumbnail';
import { useProductList } from './api';

/**
 * Choisir des produits dans le catalogue : recherche, cases à cocher,
 * les produits déjà présents restent grisés.
 */
export function ProductPicker({
  open,
  onOpenChange,
  exclude,
  onPick,
  title = 'Ajouter des produits',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exclude: Set<string>;
  onPick: (products: ProductListItemDto[]) => void;
  title?: string;
}) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Map<string, ProductListItemDto>>(new Map());
  const list = useProductList('all', q || undefined);
  const products = (list.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => p.status !== 'ARCHIVED');

  const close = (next: boolean) => {
    if (!next) {
      setPicked(new Map());
      setQ('');
    }
    onOpenChange(next);
  };

  const toggle = (product: ProductListItemDto) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={close} title={title}>
      <SearchInput label="Rechercher un produit" placeholder="Nom du produit" value={q} onChange={setQ} />
      <div className="-mx-2 flex max-h-[50dvh] flex-col overflow-y-auto">
        {list.isPending ? (
          <div className="flex flex-col gap-2 px-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : list.error ? (
          <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : products.length === 0 ? (
          <p className="px-2 py-4 text-ink-2">Aucun produit trouvé.</p>
        ) : (
          products.map((product) => {
            const already = exclude.has(product.id);
            const checked = already || picked.has(product.id);
            return (
              <button
                key={product.id}
                type="button"
                disabled={already}
                aria-pressed={checked}
                onClick={() => toggle(product)}
                className="flex items-center gap-3 rounded-[0.7rem] px-2 py-2 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-55 disabled:hover:bg-transparent"
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex size-5 shrink-0 items-center justify-center rounded-md transition-colors',
                    checked ? 'bg-ink text-canvas' : 'well',
                  )}
                >
                  {checked && <Check className="size-3.5" strokeWidth={2.6} />}
                </span>
                <Thumbnail media={product.thumbnail} alt={product.title} className="size-10" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-[600]">{product.title}</span>
                  <span className="text-[0.8125rem] text-ink-2">
                    {already ? 'Déjà dans ce catalogue' : PRODUCT_STATUS[product.status].label}
                  </span>
                </span>
              </button>
            );
          })
        )}
        {list.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="mx-2 self-start"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Voir plus de produits
          </Button>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => close(false)}>
          Annuler
        </Button>
        <Button
          variant="primary"
          disabled={picked.size === 0}
          onClick={() => {
            onPick([...picked.values()]);
            close(false);
          }}
        >
          {picked.size > 1 ? `Ajouter ${picked.size} produits` : 'Ajouter'}
        </Button>
      </div>
    </Dialog>
  );
}
