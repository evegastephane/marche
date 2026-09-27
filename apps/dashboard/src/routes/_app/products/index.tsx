import type { Currency, ProductListItemDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PackagePlus, Plus, SearchX } from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';
import { useProductList } from '@/features/products/api';
import { PRODUCT_FILTERS, PRODUCT_STATUS } from '@/features/products/status';
import { Thumbnail } from '@/features/products/thumbnail';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { formatMoney, formatRelative, plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT, riseIn, snappy } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { Tabs } from '@/shared/ui/tabs';

const searchSchema = z.object({
  status: z.enum(['all', 'ACTIVE', 'DRAFT', 'ARCHIVED']).catch('all').default('all'),
  q: z.string().trim().max(100).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/products/')({
  validateSearch: searchSchema,
  component: Produits,
});

function priceRange(item: ProductListItemDto, currency: Currency): string {
  const min = formatMoney(item.priceMinAmount, currency);
  return item.priceMinAmount === item.priceMaxAmount ? min : `${min} – ${formatMoney(item.priceMaxAmount, currency)}`;
}

function Produits() {
  const { status, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = useCurrentStore();
  const currency = store.data?.currency ?? 'XOF';
  const list = useProductList(status, q || undefined);
  const products = list.data?.pages.flatMap((page) => page.items) ?? [];

  const newButton = (
    <Link to="/products/new" className={buttonClasses('primary', 'md', 'group')}>
      <Plus className="transition-transform duration-300 group-hover:rotate-90" /> Nouveau produit
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produits"
        subtitle="Ce qui est en vente apparaît aussitôt sur votre site."
        actions={newButton}
      />

      <motion.div variants={riseIn} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          label="Filtrer les produits"
          items={PRODUCT_FILTERS}
          value={status}
          onChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, status: value }),
              replace: true,
            })
          }
        />
        <SearchInput
          label="Rechercher un produit"
          placeholder="Nom du produit"
          value={q ?? ''}
          onChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, q: value || undefined }),
              replace: true,
            })
          }
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
        ) : products.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`Aucun produit pour « ${q} »`}>
              Vérifiez l’orthographe, ou cherchez un mot plus court.
            </EmptyState>
          ) : status === 'all' ? (
            <EmptyState icon={PackagePlus} title="Votre premier produit" action={newButton}>
              Un titre, un prix et une quantité suffisent. Ajoutez des tailles ou des couleurs si l’article en a :
              chaque déclinaison a son prix et son stock.
            </EmptyState>
          ) : (
            <EmptyState icon={PackagePlus} title="Aucun produit dans ce filtre">
              Changez de filtre pour retrouver vos autres produits.
            </EmptyState>
          )
        ) : (
          <>
            <table className="w-full border-collapse text-left max-md:hidden">
              <thead>
                <tr className="eyebrow">
                  <th className="px-5 pt-4 pb-3 font-bold">Produit</th>
                  <th className="px-3 pt-4 pb-3 font-bold">Déclinaisons</th>
                  <th className="px-3 pt-4 pb-3 text-right font-bold">Prix</th>
                  <th className="px-3 pt-4 pb-3 font-bold">État</th>
                  <th className="px-5 pt-4 pb-3 text-right font-bold">Modifié</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {products.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: EASE_OUT,
                      delay: Math.min(index, 12) * 0.03,
                    }}
                    className="group relative border-t border-line transition-colors duration-200 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3.5">
                        <Thumbnail
                          media={product.thumbnail}
                          alt={product.title}
                          className="transition-transform duration-300 ease-out-soft group-hover:scale-105"
                        />
                        <div className="min-w-0">
                          <Link
                            to="/products/$productId"
                            params={{ productId: product.id }}
                            className="block truncate font-[660] text-ink no-underline after:absolute after:inset-0 after:content-['']"
                          >
                            {product.title}
                          </Link>
                          {product.brand && (
                            <span className="block truncate text-[0.8125rem] text-ink-2">{product.brand.name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-2">
                      {plural(product.variantsCount, 'déclinaison', 'déclinaisons')}
                    </td>
                    <td className="px-3 py-3 text-right font-[640] whitespace-nowrap">
                      {priceRange(product, currency)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PRODUCT_STATUS[product.status].tone}>{PRODUCT_STATUS[product.status].label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-ink-2">
                      {formatRelative(product.updatedAt)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {products.map((product, index) => (
                <motion.li
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...snappy, delay: Math.min(index, 10) * 0.035 }}
                  className="relative flex items-center gap-3.5 px-4 py-3.5 active:bg-surface-2"
                >
                  <Thumbnail media={product.thumbnail} alt={product.title} className="size-14" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      to="/products/$productId"
                      params={{ productId: product.id }}
                      className="truncate font-[660] text-ink no-underline after:absolute after:inset-0 after:content-['']"
                    >
                      {product.title}
                    </Link>
                    <span className="tabular text-[0.875rem] font-[620]">{priceRange(product, currency)}</span>
                    <span className="flex items-center gap-2 text-[0.8125rem] text-ink-2">
                      <Badge tone={PRODUCT_STATUS[product.status].tone}>{PRODUCT_STATUS[product.status].label}</Badge>
                      {plural(product.variantsCount, 'déclinaison', 'déclinaisons')}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {list.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          Voir plus de produits
        </Button>
      )}
    </div>
  );
}
