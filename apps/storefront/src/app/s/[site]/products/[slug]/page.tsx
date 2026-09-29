import { CURRENCY_EXPONENT } from '@marche/contracts';
import type { Metadata } from 'next';
import { TrackEvent } from '@/components/analytics';
import { getAvailability, getProduct, getStore } from '@/lib/storefront-api';
import { getTemplate } from '@/templates';

type Params = Promise<{ site: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { site, slug } = await params;
  const store = await getStore(site);
  const product = await getProduct(site, store.id, slug);
  return {
    title: product.seoTitle ?? product.title,
    description: product.seoDescription ?? product.description?.slice(0, 160) ?? undefined,
  };
}

/** Données partagées par tous les templates : produit, disponibilité en direct, JSON-LD. */
export default async function ProductRoute({ params }: { params: Params }) {
  const { site, slug } = await params;
  const store = await getStore(site);
  const product = await getProduct(site, store.id, slug);
  // La disponibilité n'est jamais mise en cache : elle est lue à chaque affichage.
  const stock = await getAvailability(site, product.variants.map((v) => v.id));
  const availability = Object.fromEntries(stock.variants.map((v) => [v.variantId, v.available]));
  const template = getTemplate(store.templateId);

  const scale = 10 ** CURRENCY_EXPONENT[store.currency];
  const conditionIndex = product.options.findIndex((o) => o.type === 'condition');
  const offers = product.variants.map((variant) => {
    const condition = conditionIndex === -1 ? undefined : variant.optionValues[conditionIndex];
    return {
      '@type': 'Offer',
      sku: variant.sku,
      name: variant.title,
      priceCurrency: store.currency,
      price: variant.priceAmount / scale,
      availability: availability[variant.id] === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: condition
        ? condition.startsWith('Reconditionné')
          ? 'https://schema.org/RefurbishedCondition'
          : 'https://schema.org/NewCondition'
        : undefined,
    };
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image: product.images.map((i) => i.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers:
      offers.length > 1
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: store.currency,
            lowPrice: Math.min(...offers.map((o) => o.price)),
            highPrice: Math.max(...offers.map((o) => o.price)),
            offerCount: offers.length,
            offers,
          }
        : offers[0],
  };

  return (
    <>
      <TrackEvent event="product_viewed" properties={{ productId: product.id, slug: product.slug }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <template.ProductPage site={site} store={store} product={product} availability={availability} />
    </>
  );
}
