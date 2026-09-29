import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/format';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { PriceBoard, TileGrid } from './product-card';
import { SegmentPrice } from './segments';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll = 'inline-flex min-h-11 items-center text-[0.9375rem] font-bold text-fg no-underline decoration-primary decoration-2 underline-offset-[0.4em] hover:underline';
const signTitle = 'led-text led-glow text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.95] font-extrabold uppercase';

/** Un rayon de la boutique : son nom allumé en points LED, le contenu dessous. */
function Aisle({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-20 sm:px-6 sm:pt-28">
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          {title && <h2 className={signTitle}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Première vue, sous l'enseigne qui défile : l'appareil vedette sur l'étal éclairé,
 * et à côté le titre d'accueil en points LED, le modèle, son prix allumé, puis le bouton.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  const latest = await getProducts(site, store.id, { sort: 'newest', limit: 6 });
  const heroImage = section.imageMediaId ? (store.themeMedia[section.imageMediaId] ?? null) : null;
  const lead = latest.items.find((p) => p.image) ?? latest.items[0] ?? null;
  const image = heroImage ?? lead?.image ?? null;
  const onSale = lead && lead.compareAtAmount != null && lead.compareAtAmount > lead.priceMinAmount;

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pt-14 lg:pb-20">
        {image && (
          <Link
            href={lead ? `/products/${lead.slug}` : (section.ctaHref ?? '/collections')}
            aria-label={lead?.title ?? section.title}
            className="sf-rise lit-shelf block aspect-[5/4] overflow-hidden rounded-md p-8 sm:p-12"
          >
            <img
              {...imageProps(image, '(min-width: 1024px) 48vw, 100vw')}
              alt={image.alt ?? lead?.title ?? ''}
              fetchPriority="high"
              className={heroImage ? 'size-full object-cover' : 'size-full object-contain mix-blend-multiply'}
            />
          </Link>
        )}
        <div className="flex flex-col gap-7">
          <h1 className="led-text led-glow text-[clamp(3.25rem,7.5vw,6rem)] leading-[0.9] font-extrabold uppercase">{section.title}</h1>
          {lead && (
            <Link href={`/products/${lead.slug}`} className="group flex flex-col gap-3 text-fg no-underline">
              <span className="text-[1.5rem] leading-tight font-bold text-balance group-hover:underline">
                {lead.title}
                {lead.brand && <span className="font-normal text-muted"> · {lead.brand.name}</span>}
              </span>
              <span className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <SegmentPrice
                  amount={lead.priceMinAmount}
                  currency={store.currency}
                  from={lead.priceMinAmount !== lead.priceMaxAmount}
                  className="led-glow text-[clamp(3rem,6vw,4.75rem)]"
                />
                {onSale && (
                  <s className="tabular pb-1 text-lg text-muted">
                    <span className="sr-only">au lieu de </span>
                    {formatMoney(lead.compareAtAmount!, store.currency)}
                  </s>
                )}
              </span>
            </Link>
          )}
          {section.subtitle && <p className="max-w-[44ch] text-lg leading-relaxed text-muted">{section.subtitle}</p>}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="lit-button inline-flex min-h-14 items-center justify-center self-start rounded-md px-8 text-lg font-bold no-underline transition-transform duration-200 hover:-translate-y-px"
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
    <Aisle
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className={seeAll}>
          Tout le rayon →
        </Link>
      }
    >
      <TileGrid products={products.items} currency={store.currency} />
    </Aisle>
  );
}

/** La grille de l'accueil se lit en tableau des prix : un modèle par ligne, pour comparer d'un coup d'œil. */
async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Aisle
      title={section.title}
      action={
        <Link href="/collections" className={seeAll}>
          Tous les appareils →
        </Link>
      }
    >
      <PriceBoard products={products.items} currency={store.currency} />
    </Aisle>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <Aisle title={section.title}>
      <ul className="flex flex-wrap gap-x-8 gap-y-3">
        {brands.map((brand) => (
          <li key={brand.slug} className="text-xl font-bold tracking-[0.1em] uppercase">
            {brand.name}
          </li>
        ))}
      </ul>
    </Aisle>
  );
}

function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <Aisle title={section.title}>
      <div className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-[65ch]">
            {p}
          </p>
        ))}
      </div>
    </Aisle>
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
