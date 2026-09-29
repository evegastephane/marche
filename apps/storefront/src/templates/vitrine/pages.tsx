import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import { sizeGuideOf } from '../shared';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { ProductGrid } from './product-card';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={sizeGuideOf(store, product.kind)} />;
}

/** Toute la vitrine : les filtres en étiquettes au-dessus, les appareils rangés sur les tablettes. */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-3">
        {collectionSlug && (
          <Link href="/collections" className="font-heading text-sm font-bold tracking-wide text-muted uppercase no-underline hover:text-fg">
            ← Toute la vitrine
          </Link>
        )}
        <h1 className="font-heading text-5xl leading-[0.9] font-extrabold tracking-tight uppercase sm:text-6xl">{title}</h1>
        {description && <p className="max-w-[60ch] text-lg text-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-6 border-y border-line py-5">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{
            legend: 'font-heading text-sm font-bold tracking-[0.12em] uppercase text-muted',
            chip: 'rounded-md border border-line bg-surface text-on-surface font-heading font-semibold tracking-wide uppercase hover:border-fg/40',
            active: 'border-primary bg-primary text-on-primary',
            body: 'md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-6 lg:grid-cols-3',
          }}
        />
      </div>
      <SortLinks
        base={base}
        params={params}
        hasCollection={Boolean(collectionSlug)}
        linkClassName="font-heading font-semibold tracking-wide uppercase text-muted hover:text-fg"
        activeClassName="text-fg underline decoration-primary decoration-2 underline-offset-8"
      />
      {products.items.length > 0 ? (
        <ProductGrid products={products.items} currency={store.currency} />
      ) : (
        <p className="font-heading text-2xl font-bold text-muted uppercase">Rien en vitrine pour ces critères.</p>
      )}
      <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName="rounded-md bg-primary text-on-primary font-heading uppercase tracking-wide min-h-12" />
    </div>
  );
}
