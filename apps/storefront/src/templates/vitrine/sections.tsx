import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/format';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { Reveal } from '../default/components/motion';
import { ProductGrid } from './product-card';
import { PriceTag } from './tag';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll =
  'inline-flex min-h-11 items-center font-heading text-base font-bold tracking-wide text-fg uppercase no-underline decoration-primary decoration-2 underline-offset-4 hover:underline';

function Shelf({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-20 sm:px-6 sm:pt-24">
      {(title || action) && (
        <Reveal className="flex items-end justify-between gap-4">
          {title && <h2 className="font-heading text-3xl leading-none font-extrabold tracking-wide uppercase sm:text-4xl">{title}</h2>}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

/**
 * Première vue : l'enseigne lumineuse (titre et sous-titre), puis la tablette de verre qui porte
 * les appareils vedettes, chacun avec son étiquette ; l'étiquette principale mène à la vitrine.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  const featured = await getProducts(site, store.id, { sort: 'newest', limit: 4 });
  const devices = featured.items.filter((p) => p.image).slice(0, 4);
  const backdrop = section.imageMediaId ? store.themeMedia[section.imageMediaId] : undefined;
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {backdrop && (
        <img {...imageProps(backdrop, '100vw')} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-20" />
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pt-12 pb-10 sm:px-6 sm:pt-16">
        <div className="sf-rise flex max-w-3xl flex-col gap-4">
          <h1 className="font-heading text-5xl leading-[0.9] font-extrabold tracking-tight uppercase [text-shadow:0_0_36px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] sm:text-7xl">
            {section.title}
          </h1>
          {section.subtitle && <p className="max-w-[48ch] text-lg text-muted">{section.subtitle}</p>}
        </div>
        {devices.length > 0 && (
          <div className="glass-shelf sf-rise grid grid-cols-2 items-end gap-x-6 gap-y-10 pb-4 [--sf-delay:120ms] sm:grid-cols-4">
            {devices.map((device, index) => (
              <Link key={device.id} href={`/products/${device.slug}`} className="group relative flex flex-col items-center gap-4 text-fg no-underline">
                <div className="relative flex h-44 w-full items-end justify-center sm:h-60">
                  <span aria-hidden className="stand-shadow absolute bottom-0 left-1/2 h-4 w-2/3 -translate-x-1/2" />
                  <img
                    {...imageProps(device.image!, '(min-width: 640px) 22vw, 45vw')}
                    alt={device.image!.alt ?? device.title}
                    className="relative max-h-full w-auto max-w-full object-contain transition-transform duration-500 ease-out-soft group-hover:-translate-y-2"
                  />
                </div>
                <PriceTag size="sm" className={index % 2 ? 'rotate-3' : '-rotate-3'}>
                  {formatMoney(device.priceMinAmount, store.currency)}
                </PriceTag>
                <span className="text-center font-heading text-sm font-bold tracking-wide uppercase">{device.title}</span>
              </Link>
            ))}
          </div>
        )}
        {section.ctaLabel && (
          <Link href={section.ctaHref ?? '/collections'} className="sf-rise self-start no-underline [--sf-delay:200ms]">
            <PriceTag size="lg" className="transition-transform duration-300 ease-out-soft hover:-rotate-2">
              {section.ctaLabel} →
            </PriceTag>
          </Link>
        )}
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
          Tout voir →
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
          Toute la vitrine →
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
        <ul className="flex flex-wrap gap-3">
          {brands.map((brand) => (
            <li key={brand.slug} className="rounded-md border border-line bg-surface px-4 py-2 font-heading text-lg font-bold tracking-wide text-on-surface uppercase">
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
      <Reveal className="flex max-w-[65ch] flex-col gap-4 text-lg leading-relaxed text-fg/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
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
