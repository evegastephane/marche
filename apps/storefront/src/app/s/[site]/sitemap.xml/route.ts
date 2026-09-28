import { type NextRequest, NextResponse } from 'next/server';
import { publicOrigin } from '@/lib/site';
import { getCollections, getProducts, getStore, StorefrontApiError } from '@/lib/storefront-api';

const MAX_PRODUCTS = 2000;

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c);

/** Plan du site pour les moteurs de recherche : accueil, catalogues et produits en vente. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const origin = publicOrigin(request);
  try {
    const store = await getStore(site);
    const [collections, products] = await Promise.all([getCollections(site, store.id), allProducts(site, store.id)]);
    const paths = [
      '/',
      '/collections',
      ...collections.map((c) => `/collections/${c.slug}`),
      ...products.map((p) => `/products/${p.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`).join('\n')}
</urlset>
`;
    return new NextResponse(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  } catch (error) {
    if (error instanceof StorefrontApiError && error.status === 404) return new NextResponse(null, { status: 404 });
    throw error;
  }
}

async function allProducts(site: string, storeId: string) {
  const items: { slug: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await getProducts(site, storeId, { limit: 100, cursor });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && items.length < MAX_PRODUCTS);
  return items;
}
