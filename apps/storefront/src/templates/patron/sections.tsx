import type { Section, SizeGuide, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { Reveal } from '../default/components/motion';
import { EnvelopeFront } from './envelope-front';
import { ProductGrid } from './product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const seeAll =
  'inline-flex min-h-11 items-center font-heading text-[0.9375rem] font-bold tracking-[0.06em] text-fg uppercase no-underline [font-stretch:78%] decoration-primary decoration-2 underline-offset-[0.4em] hover:underline';

/** Une planche du catalogue de patrons : son titre sur double filet, puis les enveloppes. */
function Plate({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-20 sm:px-6 sm:pt-24">
      {(title || action) && (
        <Reveal className="flex flex-wrap items-end justify-between gap-4 border-b-[5px] border-double border-fg pb-3">
          {title && (
            <h2 className="font-heading text-3xl leading-[0.9] font-black tracking-[-0.02em] text-balance uppercase [font-stretch:120%] sm:text-4xl">
              {title}
            </h2>
          )}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

/** Dos de l'enveloppe : le tableau des mesures de la boutique, celui qu'on consulte avant de choisir sa taille. */
function MeasureChart({ guide }: { guide: SizeGuide }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-black tracking-[0.02em] uppercase [font-stretch:110%]">Tableau des mesures</h2>
      <div className="overflow-x-auto border-y-[1.5px] border-fg">
        <table className="tabular w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="border-b border-fg/40 px-3 py-2 font-heading text-xs font-bold tracking-[0.08em] uppercase [font-stretch:80%]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((cells, index) => (
              <tr key={index} className="border-b border-fg/15 last:border-0">
                {cells.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-2 font-heading font-black [font-stretch:110%]">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-2">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {guide.note && <p className="max-w-[65ch] text-sm text-muted">{guide.note}</p>}
    </div>
  );
}

/**
 * Première vue : le recto de l'enveloppe. Titre d'accueil en grande grotesque large, la photo du modèle
 * vedette dans son tracé de coupe, ses vues A, B, C et le coupon ; au dos, le tableau des mesures.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  const latest = await getProducts(site, store.id, { sort: 'newest', limit: 8 });
  const pictured = latest.items.filter((p) => p.image);
  const featured = (pictured.length > 0 ? pictured : latest.items).slice(0, 3);
  return (
    <section className="border-b-[5px] border-double border-fg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
        <div className="sf-rise flex flex-col gap-6 lg:pt-6">
          <h1 className="font-heading text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.86] font-black tracking-[-0.03em] text-balance uppercase [font-stretch:125%]">
            {section.title}
          </h1>
          {section.subtitle && <p className="max-w-[46ch] text-lg leading-relaxed">{section.subtitle}</p>}
          {store.type === 'FASHION' && (
            <div className="mt-auto hidden pt-8 lg:block">
              <MeasureChart guide={store.sizeGuides.CLOTHING} />
            </div>
          )}
        </div>
        <div className="sf-rise [--sf-delay:120ms]">
          <EnvelopeFront
            products={featured}
            currency={store.currency}
            ctaLabel={section.ctaLabel || null}
            ctaHref={section.ctaHref ?? '/collections'}
          />
        </div>
        {store.type === 'FASHION' && (
          <div className="lg:hidden">
            <MeasureChart guide={store.sizeGuides.CLOTHING} />
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
    <Plate
      title={section.title || collection.title}
      action={
        <Link href={`/collections/${collection.slug}`} className={seeAll}>
          Toute la planche →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Plate>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Plate
      title={section.title}
      action={
        <Link href="/collections" className={seeAll}>
          Tous les modèles →
        </Link>
      }
    >
      <ProductGrid products={products.items} currency={store.currency} />
    </Plate>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <Plate title={section.title}>
      <Reveal>
        <ul className="flex flex-wrap items-center divide-x divide-fg/30">
          {brands.map((brand) => (
            <li key={brand.slug} className="px-4 py-1 font-heading text-xl font-black uppercase first:pl-0 [font-stretch:115%]">
              {brand.name}
            </li>
          ))}
        </ul>
      </Reveal>
    </Plate>
  );
}

function RichText({ section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <Plate title={section.title}>
      <Reveal className="gap-10 text-lg leading-relaxed md:columns-2">
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-4 max-w-[65ch] break-inside-avoid">
            {p}
          </p>
        ))}
      </Reveal>
    </Plate>
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
