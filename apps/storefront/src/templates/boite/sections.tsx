import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/format';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { Reveal } from '../default/components/motion';
import { BoxFront, Tick } from './box';
import { ProductGrid } from './product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll = 'inline-flex min-h-11 items-center text-sm font-medium text-fg no-underline decoration-primary decoration-2 underline-offset-[0.4em] hover:underline';

/** Un rayon : son titre imprimé sur le carton, les boîtes en pile dessous. */
function Shelf({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-20 sm:px-6 sm:pt-24">
      {(title || action) && (
        <Reveal className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          {title && <h2 className="text-3xl leading-none font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h2>}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

/**
 * Première vue : la boîte de l'appareil vedette de face, et à côté son étiquette dépliée,
 * le titre d'accueil en tête, les arrivages cochés ligne à ligne avec leur prix, puis le bouton.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  const latest = await getProducts(site, store.id, { sort: 'newest', limit: 6 });
  const lead = latest.items.find((p) => p.image) ?? latest.items[0];
  const rows = latest.items.slice(0, 5);
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-16">
        {lead && (
          <Link href={`/products/${lead.slug}`} className="sf-rise group block pt-3.5 pr-3.5 text-fg no-underline" aria-label={lead.title}>
            <BoxFront
              image={lead.image}
              title={lead.title}
              brand={store.name}
              sizes="(min-width: 1024px) 45vw, 90vw"
              priority
              className="aspect-[5/6] transition-transform duration-700 ease-out-soft group-hover:[transform:perspective(1400px)_rotateY(-7deg)] motion-reduce:transition-none"
            />
          </Link>
        )}
        <div className="sf-rise flex flex-col gap-6 border border-line bg-surface p-6 text-on-surface [--sf-delay:140ms] sm:p-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-balance">{section.title}</h1>
            {section.subtitle && <p className="max-w-[46ch] text-lg leading-relaxed opacity-85">{section.subtitle}</p>}
          </div>
          {rows.length > 0 && (
            <ul className="flex flex-col divide-y divide-line border-y border-line font-hand text-sm">
              {rows.map((product) => (
                <li key={product.id}>
                  <Link href={`/products/${product.slug}`} className="flex min-h-12 items-center gap-3 py-2 text-on-surface no-underline hover:underline">
                    <Tick checked={product.id === lead?.id} />
                    <span className="min-w-0 flex-1 truncate uppercase">{product.title}</span>
                    <span className="tabular shrink-0 font-semibold text-primary">{formatMoney(product.priceMinAmount, store.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="inline-flex min-h-14 items-center justify-center gap-2 bg-primary px-8 text-base font-semibold text-on-primary no-underline shadow-[0_14px_26px_-16px_var(--color-primary)] transition-transform duration-200 hover:-translate-y-px"
            >
              {section.ctaLabel} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

async function FeaturedCollection({ site, store, section }: SectionProps<'featured-collection'>) {
  if (!section.collectionId) return null;
  const collections = await getCollections(site, store.id);
  const collection = collections.find((c) => c.id === section.collectionId);
  if (!collection) return null;
  const products = await getProducts(site, store.id, { collection: collection.slug, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Shelf
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className={seeAll}>
          Tout le rayon →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Shelf>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Shelf
      title={section.title}
      action={
        <Link href="/collections" className={seeAll}>
          Tous les appareils →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Shelf>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <Shelf title={section.title}>
      <Reveal>
        <ul className="flex flex-wrap gap-x-10 gap-y-3">
          {brands.map((brand) => (
            <li key={brand.slug} className="text-lg tracking-[0.28em] uppercase">
              {brand.name}
            </li>
          ))}
        </ul>
      </Reveal>
    </Shelf>
  );
}

function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <Shelf title={section.title}>
      <Reveal className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-[65ch]">
            {p}
          </p>
        ))}
      </Reveal>
    </Shelf>
  );
}

export function HomeSections({ site, store }: { site: string; store: StorefrontStoreDto }) {
  return store.theme.sections
    .filter((section) => section.enabled)
    .map((section) => {
      switch (section.type) {
        case 'hero':
          return <Hero key={section.id} site={site} store={store} section={section} />;
        case 'featured-collection':
          return <FeaturedCollection key={section.id} site={site} store={store} section={section} />;
        case 'product-grid':
          return <ProductGridSection key={section.id} site={site} store={store} section={section} />;
        case 'brand-strip':
          return <BrandStrip key={section.id} site={site} store={store} section={section} />;
        case 'rich-text':
          return <RichText key={section.id} site={site} store={store} section={section} />;
        default:
          return null;
      }
    });
}
