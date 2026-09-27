import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { imageProps } from './components/media';
import { Reveal } from './components/motion';
import { ProductGrid } from './components/product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll = 'group inline-flex items-center gap-1 text-sm font-semibold text-fg no-underline';

function SectionShell({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-16 sm:px-6 sm:pt-24">
      {(title || action) && (
        <Reveal className="flex items-end justify-between gap-4">
          {title && <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

function Hero({ store, section }: SectionProps<'hero'>) {
  const image = section.imageMediaId ? store.themeMedia[section.imageMediaId] : undefined;
  return (
    <section className="relative isolate overflow-hidden bg-primary text-on-primary">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 -z-10 size-[28rem] rounded-full bg-accent opacity-25 blur-[110px]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-28 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <h1 className="sf-rise text-4xl leading-[1.05] font-bold sm:text-6xl">{section.title}</h1>
          {section.subtitle && (
            <p className="sf-rise max-w-[46ch] text-lg opacity-85 [--sf-delay:90ms]">{section.subtitle}</p>
          )}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="group sf-rise mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-on-accent no-underline shadow-[0_10px_30px_-12px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-out-soft [--sf-delay:180ms] hover:-translate-y-0.5 active:scale-[0.97]"
            >
              {section.ctaLabel}
              <span aria-hidden className="transition-transform duration-300 ease-out-soft group-hover:translate-x-1">
                →
              </span>
            </Link>
          )}
        </div>
        {image && (
          <div className="sf-rise aspect-[4/3] overflow-hidden rounded-3xl [--sf-delay:120ms]">
            <img {...imageProps(image, '(min-width: 1024px) 50vw, 100vw')} className="size-full object-cover" />
          </div>
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
  const products = await getProducts(site, store.id, {
    collection: collection.slug,
    limit: section.limit,
  });
  if (products.items.length === 0) return null;
  return (
    <SectionShell
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className={seeAll}>
          Tout voir{' '}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </SectionShell>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, {
    sort: section.sort,
    limit: section.limit,
  });
  if (products.items.length === 0) return null;
  return (
    <SectionShell
      title={section.title}
      action={
        <Link href="/collections" className={seeAll}>
          Tous les produits{' '}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </SectionShell>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <SectionShell title={section.title}>
      <Reveal>
        <ul className="flex flex-wrap gap-3">
          {brands.map((brand) => (
            <li key={brand.slug} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
              {brand.name}
            </li>
          ))}
        </ul>
      </Reveal>
    </SectionShell>
  );
}

/** Texte libre : paragraphes séparés par une ligne vide (sous-ensemble sûr du Markdown). */
function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <SectionShell title={section.title}>
      <Reveal className="flex max-w-[65ch] flex-col gap-4 text-lg leading-relaxed text-fg/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </Reveal>
    </SectionShell>
  );
}

/** Rendu des sections de l'accueil, dans l'ordre choisi par le marchand (Composite). */
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
          // La lettre d'information attend un fournisseur d'e-mailing : pas encore rendue.
          return null;
      }
    });
}
