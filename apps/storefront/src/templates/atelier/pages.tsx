import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import { sizeGuideOf } from '../shared';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { ProductGrid } from './product-card';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={sizeGuideOf(store, product.kind)} />;
}

const label = 'font-heading text-xs font-bold tracking-[0.14em] uppercase [font-stretch:80%]';

/** Index du cahier : les filtres en cases à cocher dans la marge, les photos collées à droite. */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-3 border-b-2 border-fg pb-3">
        {collectionSlug && (
          <Link href="/collections" className="font-hand text-lg font-bold text-accent">
            ← tous les modèles
          </Link>
        )}
        <h1 className="font-heading text-5xl leading-[0.92] font-extrabold uppercase [font-stretch:75%] sm:text-6xl">{title}</h1>
        {description && <p className="max-w-[55ch] font-hand text-xl text-accent">{description}</p>}
      </div>
      <div className="grid gap-10 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{
            legend: label,
            chip: 'border border-fg/40 text-fg hover:border-fg font-heading font-semibold [font-stretch:85%]',
            active: 'border-accent text-accent',
          }}
          className="md:sticky md:top-24 md:self-start"
        />
        <div className="flex flex-col gap-10">
          <SortLinks
            base={base}
            params={params}
            hasCollection={Boolean(collectionSlug)}
            linkClassName={`${label} text-muted hover:text-fg`}
            activeClassName="text-accent underline decoration-2 underline-offset-8"
          />
          {products.items.length > 0 ? (
            <ProductGrid products={products.items} currency={store.currency} />
          ) : (
            <p className="font-hand text-2xl text-accent">Rien sur cette page pour le moment.</p>
          )}
          <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName={`${label} border-2 border-fg min-h-12`} />
        </div>
      </div>
    </div>
  );
}
