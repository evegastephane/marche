import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { ProductGrid } from './components/product-card';
import { ProductView } from './components/product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={product.sizeGuide} />;
}

export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-3">
        {collectionSlug && (
          <Link href="/collections" className="text-sm font-semibold text-muted">
            ← Tous les produits
          </Link>
        )}
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {description && <p className="max-w-[60ch] text-lg text-fg/80">{description}</p>}
        {!collectionSlug && store.navigation.collections.length > 0 && (
          <nav aria-label="Catalogues" className="flex flex-wrap gap-2 pt-2">
            {store.navigation.collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg no-underline hover:border-fg"
              >
                {c.title}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="grid gap-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{ chip: 'rounded-full border border-line text-fg hover:border-fg', active: 'border-fg bg-fg text-bg' }}
          className="md:sticky md:top-24 md:self-start"
        />
        <div className="flex flex-col gap-8">
          <SortLinks base={base} params={params} hasCollection={Boolean(collectionSlug)} linkClassName="text-muted hover:text-fg" activeClassName="text-fg underline" />
          {products.items.length > 0 ? (
            <ProductGrid products={products.items} currency={store.currency} />
          ) : (
            <p className="text-lg text-muted">Aucun article ne correspond pour le moment.</p>
          )}
          <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName="rounded-full border border-fg" />
        </div>
      </div>
    </div>
  );
}
