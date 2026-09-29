import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getCollections, getFacets, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { Reveal } from '../default/components/motion';
import { ProductCard, ProductGrid } from './product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll =
  'inline-flex min-h-11 items-center font-heading text-base tracking-wide text-fg uppercase no-underline decoration-primary decoration-[3px] underline-offset-[6px] hover:underline';

/** Un pan de mur : l'enseigne du rayon, puis ce qu'on y expose. */
function Wall({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-20 sm:px-6 sm:pt-24">
      {(title || action) && (
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          {title && (
            <h2 className="painted-frame -rotate-1 bg-surface px-7 py-4 font-heading text-2xl leading-none text-on-surface uppercase sm:text-3xl">{title}</h2>
          )}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

/** La porte peinte : c'est le bouton qui fait entrer dans la boutique. Au survol, le battant s'entrouvre. */
function Door({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group block rounded-t-[3rem] border-4 border-line bg-line no-underline [perspective:1100px] sm:rounded-t-full ${className ?? ''}`}
    >
      <span className="relative flex h-44 w-full origin-left flex-col items-center justify-center gap-4 rounded-t-[2.6rem] bg-primary px-6 text-on-primary transition-transform duration-500 ease-out-soft group-hover:[transform:rotateY(-24deg)] group-focus-visible:[transform:rotateY(-24deg)] motion-reduce:transition-none sm:h-[25rem] sm:w-60 sm:rounded-t-full">
        <span aria-hidden className="absolute inset-x-5 top-6 bottom-[52%] hidden rounded-t-full border-2 border-on-primary/35 sm:block" />
        <span aria-hidden className="absolute inset-x-5 top-[54%] bottom-5 hidden border-2 border-on-primary/35 sm:block" />
        <span className="relative text-center font-heading text-3xl leading-none uppercase text-balance sm:text-[2.5rem]">{label}</span>
        <span aria-hidden className="relative font-heading text-2xl leading-none">→</span>
        <span aria-hidden className="absolute top-1/2 right-4 size-4 -translate-y-1/2 rounded-full border-2 border-line bg-surface sm:right-5 sm:size-5" />
      </span>
    </Link>
  );
}

/**
 * Première vue : le fronton peint au nom de la boutique, puis la façade (deux panneaux vedettes de part
 * et d'autre de la porte) et, au pied du mur, les enseignes des rayons.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  const [featured, facets] = await Promise.all([getProducts(site, store.id, { sort: 'newest', limit: 2 }), getFacets(site, store.id)]);
  const panels = featured.items.slice(0, 2);
  const backdrop = section.imageMediaId ? store.themeMedia[section.imageMediaId] : undefined;
  const rayons =
    facets.kinds.length > 1
      ? facets.kinds.map((k) => ({ key: k.value, label: k.label, href: `/collections?kind=${k.value}`, count: k.count as number | null }))
      : store.navigation.collections.map((c) => ({ key: c.slug, label: c.title, href: `/collections/${c.slug}`, count: null }));
  const door = <Door href={section.ctaHref ?? '/collections'} label={section.ctaLabel || 'Entrer'} />;

  return (
    <section className="relative isolate overflow-hidden border-b-4 border-line">
      {backdrop && <img {...imageProps(backdrop, '100vw')} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-15 grayscale" />}
      <div className="mx-auto flex max-w-6xl flex-col px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="relative">
          <div className="painted-frame brush-wipe bg-surface px-6 pt-9 pb-12 text-center text-on-surface sm:px-12 sm:pt-12 sm:pb-16">
            <h1 className="font-heading text-[clamp(2.75rem,10vw,7.5rem)] leading-[0.92] text-balance uppercase [text-shadow:0.06em_0.06em_0_var(--color-accent)]">
              {store.name}
            </h1>
            {section.subtitle && <p className="mx-auto mt-5 max-w-[46ch] text-lg text-on-surface/85">{section.subtitle}</p>}
          </div>
          {section.title && (
            <p className="sf-settle absolute inset-x-6 -bottom-6 mx-auto w-fit max-w-[calc(100%-3rem)] -rotate-1 border-4 border-line bg-primary px-5 py-2.5 text-center font-heading text-lg leading-tight text-on-primary uppercase shadow-[4px_4px_0_var(--color-line)] [--sf-delay:450ms] sm:text-2xl">
              {section.title}
            </p>
          )}
        </div>

        <div className="mt-16 grid grid-cols-2 items-end gap-x-5 gap-y-10 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-10">
          {panels[0] ? (
            <div className="sf-settle order-2 [--sf-delay:250ms] sm:order-1">
              <ProductCard product={panels[0]} currency={store.currency} priority />
            </div>
          ) : (
            <span className="order-2 sm:order-1" />
          )}
          <div className="order-1 col-span-2 sm:order-2 sm:col-span-1">{door}</div>
          {panels[1] && (
            <div className="sf-settle order-3 [--sf-delay:350ms]">
              <ProductCard product={panels[1]} currency={store.currency} priority />
            </div>
          )}
        </div>

        {rayons.length > 0 && (
          <nav aria-label="Choisir un rayon" className="-mx-4 mt-14 border-t-4 border-line px-4 pt-8 pb-12 sm:mx-0 sm:px-0">
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-5">
              {rayons.map((rayon, i) => (
                <li key={rayon.key} className={i % 2 ? 'rotate-1' : '-rotate-1'}>
                  <Link
                    href={rayon.href}
                    style={{ ['--sf-delay' as string]: `${500 + i * 90}ms` }}
                    className="brush-fill sf-settle inline-flex min-h-14 items-baseline gap-3 border-4 border-line bg-surface px-6 py-3 font-heading text-xl text-on-surface uppercase no-underline shadow-[4px_4px_0_var(--color-line)] sm:text-2xl"
                  >
                    {rayon.label}
                    {rayon.count !== null && <span className="tabular font-body text-sm font-bold opacity-75">{rayon.count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
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
    <Wall
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className={seeAll}>
          Tout le rayon →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Wall>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Wall
      title={section.title}
      action={
        <Link href="/collections" className={seeAll}>
          Tous les rayons →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Wall>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <Wall title={section.title}>
      <Reveal>
        <ul className="flex flex-wrap gap-3">
          {brands.map((brand, i) => (
            <li
              key={brand.slug}
              className={`border-2 border-line bg-surface px-4 py-2 font-heading text-lg text-on-surface uppercase ${i % 3 === 1 ? 'rotate-1' : i % 3 === 2 ? '-rotate-1' : ''}`}
            >
              {brand.name}
            </li>
          ))}
        </ul>
      </Reveal>
    </Wall>
  );
}

function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <Wall title={section.title}>
      <Reveal className="painted-frame flex max-w-3xl flex-col gap-4 bg-surface px-8 py-9 text-lg leading-relaxed text-on-surface sm:px-12">
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-[65ch]">
            {p}
          </p>
        ))}
      </Reveal>
    </Wall>
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
