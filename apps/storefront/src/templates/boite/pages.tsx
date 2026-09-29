import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import { sizeGuideOf } from '../shared';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { ProductGrid } from './product-card';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={sizeGuideOf(store, product.kind)} />;
}

const caption = 'font-hand text-[0.6875rem] tracking-[0.16em] uppercase';

/** Tout le rayon : les critères cochés sur une étiquette, les boîtes rangées dessous. */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-3">
        {collectionSlug && (
          <Link href="/collections" className="text-sm font-medium text-muted no-underline hover:text-fg">
            ← Tous les appareils
          </Link>
        )}
        <h1 className="text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-balance">{title}</h1>
        {description && <p className="max-w-[60ch] text-lg text-muted">{description}</p>}
      </div>
      <div className="border border-line bg-surface px-5 py-5 text-on-surface sm:px-7">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{
            legend: `${caption} opacity-75`,
            chip: 'border-[1.5px] border-on-surface/30 font-hand text-xs uppercase tracking-[0.08em] hover:border-on-surface',
            active: 'border-primary bg-primary text-on-primary',
            body: 'md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-6 lg:grid-cols-3',
          }}
        />
      </div>
      <SortLinks
        base={base}
        params={params}
        hasCollection={Boolean(collectionSlug)}
        linkClassName="text-sm font-medium text-muted hover:text-fg"
        activeClassName="text-fg underline decoration-primary decoration-2 underline-offset-8"
      />
      {products.items.length > 0 ? (
        <ProductGrid products={products.items} currency={store.currency} />
      ) : (
        <p className="text-2xl font-semibold tracking-[-0.02em]">Aucune boîte pour ces critères.</p>
      )}
      <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName="bg-primary text-on-primary font-semibold min-h-12" />
    </div>
  );
}
