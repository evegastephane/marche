import type { Currency, ProductDto, ProductListItemDto } from '@marche/contracts';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/format';
import { Dialog } from '@/shared/ui/dialog';
import { LoadError, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { useProduct, useProductList } from '../products/api';
import { Thumbnail } from '../products/thumbnail';

export interface PickedLine {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  priceAmount: number;
  available: number | null;
}

/**
 * Choisir un article à commander : d'abord le produit (recherche), puis sa déclinaison,
 * avec son prix et le stock disponible. Les deux étapes glissent l'une sur l'autre.
 */
export function VariantPicker({
  open,
  onOpenChange,
  currency,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  onPick: (line: PickedLine) => void;
}) {
  const [q, setQ] = useState('');
  const [product, setProduct] = useState<ProductListItemDto | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setQ('');
      setProduct(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close} title={product ? product.title : 'Ajouter un article'}>
      <AnimatePresence mode="wait" initial={false}>
        {product ? (
          <motion.div
            key="variantes"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="flex flex-col gap-3"
          >
            <button
              type="button"
              onClick={() => setProduct(null)}
              className="inline-flex items-center gap-1.5 self-start text-[0.875rem] font-[560] text-ink-2 hover:text-ink"
            >
              <ArrowLeft className="size-4" strokeWidth={1.8} /> Autres produits
            </button>
            <Variants
              productId={product.id}
              currency={currency}
              onPick={(line) => {
                onPick(line);
                close(false);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="produits"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="flex flex-col gap-3"
          >
            <SearchInput label="Rechercher un produit" placeholder="Nom du produit" value={q} onChange={setQ} />
            <Products q={q} currency={currency} onSelect={setProduct} />
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function Products({
  q,
  currency,
  onSelect,
}: {
  q: string;
  currency: Currency;
  onSelect: (product: ProductListItemDto) => void;
}) {
  const list = useProductList('ACTIVE', q || undefined);
  const products = list.data?.pages.flatMap((p) => p.items) ?? [];
  if (list.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (list.error) return <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />;
  if (products.length === 0) return <p className="py-2 text-ink-2">Aucun produit en vente ne correspond.</p>;
  return (
    <ul className="-mx-2 flex max-h-[50dvh] flex-col overflow-y-auto">
      {products.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="flex w-full items-center gap-3 rounded-[0.7rem] px-2 py-2 text-left transition-colors hover:bg-surface-2"
          >
            <Thumbnail media={product.thumbnail} alt={product.title} className="size-10" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-[600]">{product.title}</span>
              <span className="tabular text-[0.8125rem] text-ink-2">
                {formatMoney(product.priceMinAmount, currency)}
                {product.variantsCount > 1 ? ` · ${product.variantsCount} déclinaisons` : ''}
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-3" strokeWidth={1.8} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Variants({
  productId,
  currency,
  onPick,
}: {
  productId: string;
  currency: Currency;
  onPick: (line: PickedLine) => void;
}) {
  const product = useProduct(productId);
  if (product.isPending) return <Skeleton className="h-24" />;
  if (product.error) return <LoadError message={errorMessage(product.error)} onRetry={() => void product.refetch()} />;
  const variants = (product.data as ProductDto).variants.filter((v) => !v.archived);
  return (
    <ul className="-mx-2 flex flex-col">
      {variants.map((variant) => {
        const available = variant.inventory?.available ?? null;
        const out = variant.trackInventory && available !== null && available <= 0;
        return (
          <li key={variant.id}>
            <button
              type="button"
              disabled={out}
              onClick={() =>
                onPick({
                  variantId: variant.id,
                  productTitle: product.data.title,
                  variantTitle: variant.title,
                  sku: variant.sku,
                  priceAmount: variant.priceAmount,
                  available: variant.trackInventory ? available : null,
                })
              }
              className="flex w-full items-center gap-3 rounded-[0.7rem] px-2 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-[600]">{variant.title === 'Par défaut' ? 'Article unique' : variant.title}</span>
                <span className="truncate text-[0.8125rem] text-ink-2">{variant.sku}</span>
              </span>
              <span className="tabular flex flex-col items-end">
                <span className="font-[600]">{formatMoney(variant.priceAmount, currency)}</span>
                <span className={cn('text-[0.8125rem]', out ? 'text-danger-ink' : 'text-ink-2')}>
                  {available === null ? 'Stock non suivi' : out ? 'Rupture' : `${available} disponible${available > 1 ? 's' : ''}`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
