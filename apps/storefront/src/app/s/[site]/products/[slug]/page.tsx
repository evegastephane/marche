import { CURRENCY_EXPONENT } from '@marche/contracts';
import type { Metadata } from 'next';
import { getAvailability, getProduct, getStore } from '@/lib/storefront-api';
import { AddToCart } from '@/templates/default/components/add-to-cart';
import { imageProps } from '@/templates/default/components/media';

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

export default async function ProductPage({ params }: { params: Params }) {
  const { site, slug } = await params;
  const store = await getStore(site);
  const product = await getProduct(site, store.id, slug);
  // La disponibilité n'est jamais mise en cache : elle est lue à chaque affichage.
  const stock = await getAvailability(site, product.variants.map((v) => v.id));
  const availability = Object.fromEntries(stock.variants.map((v) => [v.variantId, v.available]));
  const [main, ...others] = product.images;
  const cheapest = product.variants.reduce((min, v) => Math.min(min, v.priceAmount), Number.POSITIVE_INFINITY);
  const inStock = product.variants.some((v) => availability[v.id] !== 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image: product.images.map((i) => i.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: store.currency,
      price: Number.isFinite(cheapest) ? cheapest / 10 ** CURRENCY_EXPONENT[store.currency] : undefined,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="flex flex-col gap-3">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-soft">
          {main ? (
            <img {...imageProps(main, '(min-width: 1024px) 55vw, 100vw')} alt={main.alt ?? product.title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center p-8 text-center font-heading text-3xl text-muted">
              {product.title}
            </div>
          )}
        </div>
        {others.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {others.slice(0, 8).map((image) => (
              <div key={image.id} className="aspect-square overflow-hidden rounded-lg bg-soft">
                <img {...imageProps(image, '15vw')} alt={image.alt ?? product.title} loading="lazy" className="size-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-2">
          {product.brand && <span className="text-sm font-semibold tracking-wide text-muted uppercase">{product.brand.name}</span>}
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{product.title}</h1>
        </div>
        <AddToCart options={product.options} variants={product.variants} availability={availability} currency={store.currency} />
        {product.description && (
          <div className="flex flex-col gap-3 border-t border-line pt-6 leading-relaxed text-fg/85">
            {product.description
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
