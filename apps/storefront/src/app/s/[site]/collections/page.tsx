import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollections, getProducts, getStore } from '@/lib/storefront-api';
import { ProductGrid } from '@/templates/default/components/product-card';

export const metadata: Metadata = { title: 'Tous les produits' };

export default async function AllProducts({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  const [collections, products] = await Promise.all([
    getCollections(site, store.id),
    getProducts(site, store.id, { sort: 'newest', limit: 48 }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-bold sm:text-5xl">Tous les produits</h1>
        {collections.length > 0 && (
          <nav aria-label="Catalogues" className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg no-underline hover:border-fg">
                {c.title}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {products.items.length > 0 ? (
        <ProductGrid products={products.items} currency={store.currency} />
      ) : (
        <p className="text-lg text-muted">Aucun produit en vente pour le moment.</p>
      )}
    </div>
  );
}
