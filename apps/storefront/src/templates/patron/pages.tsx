import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { ProductGrid } from './product-card';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={product.sizeGuide} />;
}

const label = 'font-heading text-xs font-bold tracking-[0.1em] uppercase [font-stretch:80%]';

/** Catalogue de patrons : le guide de sélection en marge, les enveloppes rangées par planche. */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-3 border-b-[5px] border-double border-fg pb-4">
        {collectionSlug && (
          <Link href="/collections" className={`${label} text-fg underline decoration-primary decoration-2 underline-offset-4`}>
            ← Tous les modèles
          </Link>
        )}
        <h1 className="font-heading text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.88] font-black tracking-[-0.03em] text-balance uppercase [font-stretch:122%]">
          {title}
        </h1>
        {description && <p className="max-w-[60ch] text-lg">{description}</p>}
      </div>
      <div className="grid gap-10 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{
            legend: `${label} text-fg`,
            chip: 'border-[1.5px] border-fg/40 text-fg hover:border-fg font-heading font-bold [font-stretch:95%]',
            active: 'border-primary bg-primary text-on-primary',
          }}
          className="md:sticky md:top-28 md:self-start"
        />
        <div className="flex flex-col gap-8">
          <SortLinks
            base={base}
            params={params}
            hasCollection={Boolean(collectionSlug)}
            linkClassName={`${label} text-muted hover:text-fg`}
            activeClassName="text-fg underline decoration-primary decoration-2 underline-offset-8"
          />
          {products.items.length > 0 ? (
            <ProductGrid products={products.items} currency={store.currency} />
          ) : (
            <p className="font-heading text-2xl font-black uppercase [font-stretch:115%]">Aucun modèle pour ces critères.</p>
          )}
          <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName={`${label} border-[1.5px] border-fg bg-fg text-bg min-h-12`} />
        </div>
      </div>
    </div>
  );
}
