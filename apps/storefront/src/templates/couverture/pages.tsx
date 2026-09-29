import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import { sizeGuideOf } from '../shared';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { PagesGrid } from './product-card';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return (
    <div className="page-turn">
      <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={sizeGuideOf(store, product.kind)} />
    </div>
  );
}

/** Le sommaire : le titre de la rubrique en très grand, les filtres dans un encadré, puis les pages. */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  return (
    <div className="page-turn mx-auto flex max-w-[88rem] flex-col gap-10 px-4 pt-10 sm:px-8 sm:pt-14">
      <div className="flex flex-col gap-5">
        {collectionSlug && (
          <Link href="/collections" className="self-start font-heading text-lg font-extrabold tracking-[0.03em] text-fg uppercase no-underline hover:underline">
            ← Tous les articles
          </Link>
        )}
        <h1 className="font-heading text-[clamp(3.25rem,9vw,6rem)] leading-[0.82] font-black tracking-[-0.02em] text-balance uppercase [font-variation-settings:'opsz'_72]">
          {title}
        </h1>
        {description && <p className="max-w-[56ch] text-xl leading-snug font-medium">{description}</p>}
      </div>
      <div className="bg-surface px-5 py-6 text-on-surface sm:px-8">
        <CatalogFilters
          base={base}
          params={params}
          facets={facets}
          currency={store.currency}
          skin={{
            legend: 'font-heading text-lg leading-none font-black uppercase tracking-[0.02em]',
            chip: 'border-2 border-on-surface font-semibold hover:bg-on-surface/10',
            active: 'bg-on-surface text-surface',
            body: 'md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-6 lg:grid-cols-3',
          }}
        />
      </div>
      <SortLinks
        base={base}
        params={params}
        hasCollection={Boolean(collectionSlug)}
        className="border-b-[3px] border-fg pb-3"
        linkClassName="font-heading text-lg font-extrabold uppercase tracking-[0.03em] text-muted hover:text-fg"
        activeClassName="text-fg underline decoration-primary decoration-[3px] underline-offset-[0.35em]"
      />
      {products.items.length > 0 ? (
        <PagesGrid products={products.items} currency={store.currency} feature={!params.cursor} />
      ) : (
        <p className="font-heading text-4xl leading-[0.9] font-black uppercase">Aucune pièce pour ces critères.</p>
      )}
      <CatalogPager
        base={base}
        params={params}
        nextCursor={products.nextCursor}
        linkClassName="min-h-14 bg-primary font-heading text-xl font-black uppercase tracking-[0.02em] text-on-primary"
      />
    </div>
  );
}
