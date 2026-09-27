import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { imageProps } from './components/media';
import { ProductGrid } from './components/product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

function SectionShell({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-16 sm:px-6 sm:pt-20">
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          {title && <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Hero({ store, section }: SectionProps<'hero'>) {
  const image = section.imageMediaId ? store.themeMedia[section.imageMediaId] : undefined;
  return (
    <section className="bg-primary text-on-primary">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <h1 className="text-4xl leading-[1.05] font-bold sm:text-6xl">{section.title}</h1>
          {section.subtitle && <p className="max-w-[46ch] text-lg opacity-85">{section.subtitle}</p>}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="mt-2 rounded-full bg-accent px-6 py-3 font-semibold text-on-accent no-underline transition-transform duration-200 hover:-translate-y-0.5"
            >
              {section.ctaLabel}
            </Link>
          )}
        </div>
        {image && (
          <div className="aspect-[4/3] overflow-hidden rounded-2xl">
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
  const products = await getProducts(site, store.id, { collection: collection.slug, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <SectionShell
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className="text-sm font-semibold text-fg">
          Tout voir
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </SectionShell>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <SectionShell
      title={section.title}
      action={
        <Link href="/collections" className="text-sm font-semibold text-fg">
          Tous les produits
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
      <ul className="flex flex-wrap gap-3">
        {brands.map((brand) => (
          <li key={brand.slug} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
            {brand.name}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/** Texte libre : paragraphes séparés par une ligne vide (sous-ensemble sûr du Markdown). */
function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <SectionShell title={section.title}>
      <div className="flex max-w-[65ch] flex-col gap-4 text-lg leading-relaxed text-fg/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
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
