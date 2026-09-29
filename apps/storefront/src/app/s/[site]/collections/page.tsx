import { CURRENCY_EXPONENT } from '@marche/contracts';
import type { Metadata } from 'next';
import { activeFilterCount, parseCatalogParams, toProductQuery } from '@/lib/catalog-query';
import { getFacets, getProducts, getStore } from '@/lib/storefront-api';
import { getTemplate } from '@/templates';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filtered = activeFilterCount(parseCatalogParams(await searchParams)) > 0;
  // Une page filtrée ne s'indexe pas : elle renvoie à la page d'ensemble.
  return { title: 'Tous les produits', alternates: { canonical: '/collections' }, robots: filtered ? { index: false } : undefined };
}

export default async function AllProducts({ params, searchParams }: { params: Promise<{ site: string }>; searchParams: SearchParams }) {
  const { site } = await params;
  const store = await getStore(site);
  const catalog = parseCatalogParams(await searchParams);
  const [products, facets] = await Promise.all([
    getProducts(site, store.id, { ...toProductQuery(catalog, CURRENCY_EXPONENT[store.currency]), sort: catalog.sort ?? 'newest', limit: 24 }),
    getFacets(site, store.id, {}),
  ]);
  const template = getTemplate(store.templateId);

  return (
    <template.CatalogPage
      site={site}
      store={store}
      title="Tous les produits"
      description={null}
      base="/collections"
      params={catalog}
      products={products}
      facets={facets}
    />
  );
}
