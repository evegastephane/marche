import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { CatalogView } from './catalog-view';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={product.sizeGuide} />;
}

/** Tout un rayon : son nom en points LED, les filtres en voyants, puis la vitrine ou le tableau des prix. */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-col gap-4">
        {collectionSlug && (
          <Link href="/collections" className="self-start text-[0.9375rem] font-bold text-muted no-underline hover:text-fg">
            ← Tous les appareils
          </Link>
        )}
        <h1 className="led-text led-glow text-[clamp(2.75rem,6.5vw,5rem)] leading-[0.92] font-extrabold uppercase">{title}</h1>
        {description && <p className="max-w-[60ch] text-lg text-muted">{description}</p>}
      </div>
      <div className="rounded-md border border-line px-5 py-5 sm:px-7">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{
            legend: 'text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-muted',
            chip: 'rounded-md border border-line font-bold hover:border-fg/40',
            active: 'lit-button border-transparent',
            body: 'md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-6 lg:grid-cols-3',
          }}
        />
      </div>
      <SortLinks
        base={base}
        params={params}
        hasCollection={Boolean(collectionSlug)}
        linkClassName="text-[0.9375rem] font-bold text-muted hover:text-fg"
        activeClassName="text-fg underline decoration-primary decoration-2 underline-offset-8"
      />
      {products.items.length > 0 ? (
        <CatalogView products={products.items} currency={store.currency} />
      ) : (
        <p className="led-text led-glow text-4xl leading-none font-extrabold uppercase">Aucun appareil pour ces critères</p>
      )}
      <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName="lit-button min-h-12 rounded-md font-bold" />
    </div>
  );
}
