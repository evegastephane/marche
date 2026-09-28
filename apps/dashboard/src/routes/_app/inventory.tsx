import type { InventoryItemDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Boxes, History, SearchX, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { z } from 'zod';
import { type InventoryFilter, useInventoryList } from '@/features/inventory/api';
import { AdjustDialog, MovementsDialog, ThresholdDialog } from '@/features/inventory/dialogs';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { useMedia } from '@/shared/lib/use-media';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { glide, riseIn } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { Tabs } from '@/shared/ui/tabs';

const searchSchema = z.object({
  filter: z.enum(['all', 'low', 'out']).catch('all').default('all'),
  q: z.string().trim().max(100).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/inventory')({
  validateSearch: searchSchema,
  component: Stock,
});

const FILTERS: { value: InventoryFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'low', label: 'Stock bas' },
  { value: 'out', label: 'Rupture' },
];

function StockState({ item }: { item: InventoryItemDto }) {
  if (item.isOut) return <Badge tone="danger">Rupture</Badge>;
  if (item.isLow) return <Badge tone="attention">Stock bas</Badge>;
  return <Badge tone="on">En stock</Badge>;
}

function Stock() {
  const { filter, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = useCurrentStore();
  const list = useInventoryList(filter, q || undefined);
  const desktop = useMedia('(min-width: 768px)');
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const [adjusting, setAdjusting] = useState<InventoryItemDto | null>(null);
  const [threshold, setThreshold] = useState<InventoryItemDto | null>(null);
  const [history, setHistory] = useState<InventoryItemDto | null>(null);

  const actions = (item: InventoryItemDto) => (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" icon={<History strokeWidth={1.8} />} onClick={() => setHistory(item)}>
        <span className="max-lg:sr-only">Historique</span>
      </Button>
      <Button size="sm" variant="ghost" icon={<SlidersHorizontal strokeWidth={1.8} />} onClick={() => setThreshold(item)}>
        <span className="max-lg:sr-only">Seuil</span>
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setAdjusting(item)}>
        Ajuster
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stock"
        subtitle="En main, réservé par des commandes, disponible à la vente. Chaque mouvement reste dans l’historique."
      />

      <motion.div variants={riseIn} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          label="Filtrer le stock"
          items={FILTERS}
          value={filter}
          onChange={(value) => void navigate({ search: (prev) => ({ ...prev, filter: value }), replace: true })}
        />
        <SearchInput
          label="Rechercher un article"
          placeholder="Produit ou SKU"
          value={q ?? ''}
          onChange={(value) => void navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
          className="md:w-72"
        />
      </motion.div>

      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.error ? (
          <div className="p-5">
            <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : items.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`Aucun article pour « ${q} »`}>
              Cherchez un nom de produit ou une référence (SKU).
            </EmptyState>
          ) : filter === 'all' ? (
            <EmptyState
              icon={Boxes}
              title="Pas encore de stock"
              action={
                <Link to="/products/new" className="text-[0.875rem] font-[600] text-ink underline">
                  Ajouter un produit
                </Link>
              }
            >
              Le stock se crée avec chaque produit : indiquez la quantité à la création, puis ajustez-la ici.
            </EmptyState>
          ) : (
            <EmptyState icon={Boxes} title={filter === 'out' ? 'Aucune rupture' : 'Rien sous les seuils'}>
              Tous vos articles sont au-dessus de leur seuil d’alerte.
            </EmptyState>
          )
        ) : desktop ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="legend">
                <th className="px-5 pt-4 pb-3 font-[600]">Article</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">En main</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">Réservé</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">Disponible</th>
                <th className="px-3 pt-4 pb-3 font-[600]">État</th>
                <th className="px-5 pt-4 pb-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {items.map((item, index) => (
                <motion.tr
                  key={item.variantId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...glide, delay: Math.min(index, 12) * 0.025 }}
                  className="border-t border-line transition-colors duration-200 hover:bg-surface-2"
                >
                  <td className="max-w-[20rem] px-5 py-3">
                    <Link
                      to="/products/$productId"
                      params={{ productId: item.productId }}
                      className="block truncate font-[600] text-ink no-underline hover:underline"
                    >
                      {item.productTitle}
                    </Link>
                    <span className="block truncate text-[0.8125rem] text-ink-2">
                      {item.variantTitle !== 'Par défaut' ? `${item.variantTitle} · ` : ''}
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <AnimatedNumber value={item.onHand} />
                  </td>
                  <td className="px-3 py-3 text-right text-ink-2">
                    <AnimatedNumber value={item.reserved} />
                  </td>
                  <td className="px-3 py-3 text-right text-[1.0625rem] font-[650]">
                    <AnimatedNumber value={item.available} />
                  </td>
                  <td className="px-3 py-3">
                    <StockState item={item} />
                  </td>
                  <td className="px-5 py-3">{actions(item)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item, index) => (
              <motion.li
                key={item.variantId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...glide, delay: Math.min(index, 10) * 0.03 }}
                className="flex flex-col gap-3 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/products/$productId"
                      params={{ productId: item.productId }}
                      className="block truncate font-[600] text-ink no-underline"
                    >
                      {item.productTitle}
                    </Link>
                    <span className="block truncate text-[0.8125rem] text-ink-2">
                      {item.variantTitle !== 'Par défaut' ? `${item.variantTitle} · ` : ''}
                      {item.sku}
                    </span>
                  </div>
                  <StockState item={item} />
                </div>
                <div className="tabular flex items-center justify-between gap-3 text-[0.875rem] text-ink-2">
                  <span>
                    Dispo <strong className="text-[1.0625rem] text-ink">{item.available}</strong> · en main {item.onHand} ·
                    réservé {item.reserved}
                  </span>
                </div>
                {actions(item)}
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
          Voir plus d’articles
        </Button>
      )}

      <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} />
      <ThresholdDialog
        item={threshold}
        storeDefault={store.data?.lowStockDefault ?? 5}
        onClose={() => setThreshold(null)}
      />
      <MovementsDialog item={history} onClose={() => setHistory(null)} />
    </div>
  );
}
