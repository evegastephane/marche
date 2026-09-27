import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollection, getProducts, getStore } from '@/lib/storefront-api';
import { ProductGrid } from '@/templates/default/components/product-card';

type Params = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { site, slug } = await params;
  const store = await getStore(site);
  const collection = await getCollection(site, store.id, slug);
  return { title: collection.title, description: collection.description ?? undefined };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { site, slug } = await params;
  const store = await getStore(site);
  const collection = await getCollection(site, store.id, slug);
  const products = await getProducts(site, store.id, { collection: slug, sort: 'featured', limit: 48 });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link href="/collections" className="text-sm font-semibold text-muted">
          ← Tous les produits
        </Link>
        <h1 className="text-4xl font-bold sm:text-5xl">{collection.title}</h1>
        {collection.description && <p className="max-w-[60ch] text-lg text-fg/80">{collection.description}</p>}
      </div>
      {products.items.length > 0 ? (
        <ProductGrid products={products.items} currency={store.currency} />
      ) : (
        <p className="text-lg text-muted">Ce catalogue est vide pour le moment.</p>
      )}
    </div>
  );
}
