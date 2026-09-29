import { CURRENCY_EXPONENT } from '@marche/contracts';
import type { Metadata } from 'next';
import { activeFilterCount, parseCatalogParams, toProductQuery } from '@/lib/catalog-query';
import { getCollection, getFacets, getProducts, getStore } from '@/lib/storefront-api';
import { getTemplate } from '@/templates';

type Params = Promise<{ site: string; slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  const { site, slug } = await params;
  const store = await getStore(site);
  const collection = await getCollection(site, store.id, slug);
  const filtered = activeFilterCount(parseCatalogParams(await searchParams)) > 0;
  return {
    title: collection.title,
    description: collection.description ?? undefined,
    alternates: { canonical: `/collections/${slug}` },
    robots: filtered ? { index: false } : undefined,
  };
}

export default async function CollectionRoute({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { site, slug } = await params;
  const store = await getStore(site);
  const collection = await getCollection(site, store.id, slug);
  const catalog = parseCatalogParams(await searchParams);
  const [products, facets] = await Promise.all([
    getProducts(site, store.id, {
      ...toProductQuery(catalog, CURRENCY_EXPONENT[store.currency]),
      collection: slug,
      sort: catalog.sort ?? 'featured',
      limit: 24,
    }),
    getFacets(site, store.id, { collection: slug }),
  ]);
  const template = getTemplate(store.templateId);

  return (
    <template.CatalogPage
      site={site}
      store={store}
      title={collection.title}
      description={collection.description}
      base={`/collections/${slug}`}
      params={catalog}
      products={products}
      facets={facets}
      collectionSlug={slug}
    />
  );
}
