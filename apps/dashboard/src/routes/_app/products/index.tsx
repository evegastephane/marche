import type { Currency, ProductListItemDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PackagePlus, Plus, SearchX } from 'lucide-react';
import { z } from 'zod';
import { useProductList } from '@/features/products/api';
import { PRODUCT_FILTERS, PRODUCT_STATUS } from '@/features/products/status';
import { Thumbnail } from '@/features/products/thumbnail';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { formatMoney, formatRelative, plural } from '@/shared/lib/format';
import { Button, buttonClasses } from '@/shared/ui/button';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Onglets } from '@/shared/ui/onglets';
import { Plaque } from '@/shared/ui/plaque';
import { SearchInput } from '@/shared/ui/search';

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
    <Link to="/products/new" className={buttonClasses('primaire')}>
      <Plus /> Nouveau produit
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Produits" subtitle="Ce qui est en vente apparaît aussitôt sur votre site." actions={newButton} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Onglets
          label="Filtrer les produits"
          items={PRODUCT_FILTERS}
          value={status}
          onChange={(value) => void navigate({ search: (prev) => ({ ...prev, status: value }), replace: true })}
        />
        <SearchInput
          label="Rechercher un produit"
          placeholder="Nom du produit"
          value={q ?? ''}
          onChange={(value) => void navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
          className="md:w-72"
        />
      </div>

      <section className="planche overflow-hidden">
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
                <tr className="text-[0.75rem] font-bold tracking-[0.05em] text-encre-2 uppercase">
                  <th className="px-5 pt-4 pb-3 font-bold">Produit</th>
                  <th className="px-3 pt-4 pb-3 font-bold">Déclinaisons</th>
                  <th className="px-3 pt-4 pb-3 text-right font-bold">Prix</th>
                  <th className="px-3 pt-4 pb-3 font-bold">État</th>
                  <th className="px-5 pt-4 pb-3 text-right font-bold">Modifié</th>
                </tr>
              </thead>
              <tbody className="chiffres">
                {products.map((product) => (
                  <tr key={product.id} className="relative border-t border-filet transition-colors duration-150 hover:bg-baobab-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3.5">
                        <Thumbnail media={product.thumbnail} alt={product.title} />
                        <div className="min-w-0">
                          <Link
                            to="/products/$productId"
                            params={{ productId: product.id }}
                            className="block truncate font-[660] text-encre no-underline after:absolute after:inset-0 after:content-['']"
                          >
                            {product.title}
                          </Link>
                          {product.brand && <span className="block truncate text-[0.8125rem] text-encre-2">{product.brand.name}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-encre-2">{plural(product.variantsCount, 'déclinaison', 'déclinaisons')}</td>
                    <td className="px-3 py-3 text-right font-[640] whitespace-nowrap">{priceRange(product, currency)}</td>
                    <td className="px-3 py-3">
                      <Plaque tone={PRODUCT_STATUS[product.status].tone}>{PRODUCT_STATUS[product.status].label}</Plaque>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-encre-2">{formatRelative(product.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-filet md:hidden">
              {products.map((product) => (
                <li key={product.id} className="relative flex items-center gap-3.5 px-4 py-3.5">
                  <Thumbnail media={product.thumbnail} alt={product.title} className="size-14" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      to="/products/$productId"
                      params={{ productId: product.id }}
                      className="truncate font-[660] text-encre no-underline after:absolute after:inset-0 after:content-['']"
                    >
                      {product.title}
                    </Link>
                    <span className="chiffres text-[0.875rem] font-[620]">{priceRange(product, currency)}</span>
                    <span className="flex items-center gap-2 text-[0.8125rem] text-encre-2">
                      <Plaque tone={PRODUCT_STATUS[product.status].tone}>{PRODUCT_STATUS[product.status].label}</Plaque>
                      {plural(product.variantsCount, 'déclinaison', 'déclinaisons')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {list.hasNextPage && (
        <Button variant="secondaire" className="self-center" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          Voir plus de produits
        </Button>
      )}
    </div>
  );
}
