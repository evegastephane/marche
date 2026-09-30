import Link from 'next/link';
import { CatalogFilters, CatalogPager, SortLinks } from '@/components/shop/filters';
import { catalogHref } from '@/lib/catalog-query';
import type { CatalogPageProps, ProductPageProps } from '../types';
import { ProductGrid } from './product-card';
import { ProductView } from './product-view';

export function ProductPage({ store, product, availability }: ProductPageProps) {
  return <ProductView product={product} availability={availability} currency={store.currency} sizeGuide={product.sizeGuide} />;
}

/**
 * Un rayon de la devanture : son enseigne peinte d'un coup de pinceau, les autres rayons à côté,
 * puis les cadres des articles.
 */
export function CatalogPage({ store, title, description, base, params, products, facets, collectionSlug }: CatalogPageProps) {
  const kind = facets.kinds.find((k) => k.value === params.kind);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col items-start gap-4">
        {collectionSlug && (
          <Link href="/collections" className="font-heading text-sm tracking-wide text-fg uppercase underline decoration-primary decoration-2 underline-offset-4">
            ← Tous les rayons
          </Link>
        )}
        <h1 key={kind?.value ?? title} className="brush-wipe -rotate-1 border-4 border-line bg-primary px-6 py-3 font-heading text-4xl leading-none text-on-primary uppercase shadow-[5px_5px_0_var(--color-line)] sm:text-5xl">
          {kind && !collectionSlug ? kind.label : title}
        </h1>
        {description && <p className="max-w-[60ch] text-lg text-muted">{description}</p>}
      </div>
      {facets.kinds.length > 1 && (
        <nav aria-label="Rayons" className="flex flex-wrap gap-3">
          {facets.kinds.map((k, i) => {
            const current = params.kind === k.value;
            return (
              <Link
                key={k.value}
                href={catalogHref(base, params, { kind: current ? undefined : k.value })}
                aria-current={current ? 'true' : undefined}
                className={`brush-fill inline-flex min-h-12 items-baseline gap-2.5 border-[3px] border-line bg-surface px-4 py-2 font-heading text-lg text-on-surface uppercase no-underline ${i % 2 ? 'rotate-1' : '-rotate-1'} ${current ? 'shadow-[3px_3px_0_var(--color-line)]' : ''}`}
              >
                {k.label}
                <span className="tabular font-body text-xs font-bold opacity-75">{k.count}</span>
              </Link>
            );
          })}
        </nav>
      )}
      <div className="painted-frame bg-surface px-6 py-6 text-on-surface sm:px-8">
        <CatalogFilters
          base={base}
          params={params}
          facets={{ ...facets, kinds: [] }}
          currency={store.currency}
          skin={{
            legend: 'font-heading text-base uppercase tracking-wide',
            chip: 'border-2 border-line bg-surface text-on-surface font-bold hover:bg-bg/10',
            active: 'bg-primary text-on-primary',
            body: 'md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-6 lg:grid-cols-3',
          }}
        />
      </div>
      <SortLinks
        base={base}
        params={params}
        hasCollection={Boolean(collectionSlug)}
        linkClassName="font-heading tracking-wide uppercase text-muted hover:text-fg"
        activeClassName="text-fg underline decoration-primary decoration-[3px] underline-offset-8"
      />
      {products.items.length > 0 ? (
        <ProductGrid products={products.items} currency={store.currency} />
      ) : (
        <p className="painted-frame self-start bg-surface px-8 py-6 font-heading text-2xl text-on-surface uppercase">Rien dans ce rayon pour le moment.</p>
      )}
      <CatalogPager base={base} params={params} nextCursor={products.nextCursor} linkClassName="border-4 border-line bg-primary text-on-primary font-heading uppercase min-h-12 shadow-[4px_4px_0_var(--color-line)]" />
    </div>
  );
}
