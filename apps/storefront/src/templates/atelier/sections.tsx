import type { Section, StorefrontStoreDto } from '@marche/contracts';
import { Scissors } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { Reveal } from '../default/components/motion';
import { ProductGrid } from './product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll =
  'group inline-flex min-h-11 items-center gap-1.5 font-hand text-lg font-bold text-accent no-underline decoration-2 underline-offset-4 hover:underline';

/** Page du cahier : titre imprimé sur la ligne, contenu sur le papier. */
function Page({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-20 sm:px-6 sm:pt-28">
      {(title || action) && (
        <Reveal className="flex items-end justify-between gap-4 border-b-2 border-fg pb-2">
          {title && <h2 className="font-heading text-3xl leading-none font-extrabold uppercase [font-stretch:78%] sm:text-4xl">{title}</h2>}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

/**
 * Première page : la ligne « Atelier » remplie au stylo, la photo vedette collée de biais,
 * le titre imprimé, la note manuscrite et le bon perforé qui mène aux modèles.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  let image = section.imageMediaId ? store.themeMedia[section.imageMediaId] : undefined;
  if (!image) {
    const first = await getProducts(site, store.id, { sort: 'newest', limit: 1 });
    image = first.items[0]?.image ?? undefined;
  }
  return (
    <section className="ruled-paper border-b-2 border-double border-line">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-14 sm:px-6 sm:pt-8 sm:pl-20 lg:pb-20">
        <p className="sf-rise flex flex-wrap items-baseline gap-x-3 border-b border-fg/40 pb-1 font-heading text-xs font-semibold tracking-[0.14em] uppercase [font-stretch:80%]">
          Atelier
          <span className="font-hand text-2xl font-bold tracking-normal text-accent normal-case">{store.name}</span>
        </p>
        <div className="grid items-center gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          {image && (
            <div className="sf-rise relative mx-auto w-[82%] max-w-md -rotate-[2.5deg] bg-surface p-3 pb-5 shadow-[0_2px_2px_rgb(0_0_0/0.06),0_24px_40px_-18px_rgb(0_0_0/0.45)] [--sf-delay:120ms]">
              <span aria-hidden className="tape top-0 left-5 z-10 -translate-y-1/2 -rotate-12" />
              <span aria-hidden className="tape top-0 right-5 z-10 -translate-y-1/2 rotate-[14deg]" />
              <div className="aspect-[4/5] overflow-hidden">
                <img {...imageProps(image, '(min-width: 1024px) 40vw, 80vw')} alt={image.alt ?? ''} className="size-full object-cover" />
              </div>
            </div>
          )}
          <div className="flex flex-col items-start gap-6">
            <h1 className="sf-rise font-heading text-5xl leading-[0.92] font-extrabold uppercase [font-stretch:75%] sm:text-7xl">
              {section.title}
            </h1>
            {section.subtitle && (
              <p className="sf-rise max-w-[36ch] -rotate-[0.6deg] font-hand text-2xl leading-snug text-accent [--sf-delay:90ms]">
                {section.subtitle}
              </p>
            )}
            {section.ctaLabel && (
              <Link
                href={section.ctaHref ?? '/collections'}
                className="group sf-rise relative mt-2 inline-flex min-h-14 items-center gap-3 border-l-2 border-dashed border-fg/40 bg-surface pr-6 pl-5 font-heading font-bold tracking-[0.08em] text-fg uppercase no-underline shadow-[0_10px_22px_-14px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-out-soft [font-stretch:82%] [--sf-delay:180ms] hover:-translate-y-0.5"
              >
                <Scissors className="size-5 -rotate-90 text-primary" strokeWidth={1.8} aria-hidden />
                {section.ctaLabel}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            )}
          </div>
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
    <Page
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className={seeAll}>
          tout voir →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Page>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Page
      title={section.title}
      action={
        <Link href="/collections" className={seeAll}>
          tous les modèles →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Page>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <Page title={section.title}>
      <Reveal>
        <ul className="flex flex-wrap gap-x-8 gap-y-3 font-hand text-2xl text-accent">
          {brands.map((brand) => (
            <li key={brand.slug}>{brand.name}</li>
          ))}
        </ul>
      </Reveal>
    </Page>
  );
}

/** Texte libre : une note de l'atelier, écrite sur les lignes du cahier. */
function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <Page title={section.title}>
      <Reveal className="ruled-paper -mx-4 flex flex-col gap-8 px-4 py-2 font-hand text-[1.375rem] leading-[2rem] text-accent sm:mx-0 sm:pl-20">
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-[60ch]">
            {p}
          </p>
        ))}
      </Reveal>
    </Page>
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
