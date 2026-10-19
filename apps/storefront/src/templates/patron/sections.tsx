import type { Section, SizeGuide, StorefrontStoreDto } from '@marche/contracts';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getProducts } from '@/lib/storefront-api';
import { Reveal } from '../default/components/motion';
import { EnvelopeFront } from './envelope-front';
import { ProductGrid } from './product-card';
import { imageProps } from '../default/components/media';
import { cn } from '@/lib/format';
import {
  contactLines,
  faqItemsOf,
  featuredSelection,
  hasContact,
  paragraphsOf,
  SectionList,
  sectionImage,
} from '../shared/home-sections';

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
          {store.sizeGuide && (
            <div className="mt-auto hidden pt-8 lg:block">
              <MeasureChart guide={store.sizeGuide} />
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
        {store.sizeGuide && (
          <div className="lg:hidden">
            <MeasureChart guide={store.sizeGuide} />
          </div>
        )}
      </div>
    </section>
  );
}

async function FeaturedCollection({ site, store, section }: SectionProps<'featured-collection'>) {
  const selection = await featuredSelection(site, store, section);
  if (!selection) return null;
  return (
    <Plate
      title={selection.title}
      action={
        <Link href={selection.href} className={seeAll}>
          Toute la planche →
        </Link>
      }
    >
      <ProductGrid products={selection.products} currency={store.currency} />
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

/** La photo du modèle dans son tracé de coupe, les explications à côté. */
function ImageText({ store, section }: SectionProps<'image-text'>) {
  const image = sectionImage(store, section.imageMediaId);
  const paragraphs = paragraphsOf(section.body);
  if (!image && paragraphs.length === 0 && !section.title) return null;
  return (
    <Plate title={section.title}>
      <Reveal className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {image && (
          <div className={cn('border-2 border-dashed border-fg/50 p-3', section.imagePosition === 'right' && 'lg:order-2')}>
            <div className="aspect-[4/5] overflow-hidden">
              <img {...imageProps(image, '(min-width: 1024px) 45vw, 100vw')} alt={image.alt ?? ''} className="size-full object-cover" />
            </div>
          </div>
        )}
        <div className="flex flex-col items-start gap-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="max-w-[56ch] text-lg leading-relaxed">
              {p}
            </p>
          ))}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="mt-2 inline-flex min-h-12 items-center border-[1.5px] border-fg px-6 font-heading text-[0.9375rem] font-bold tracking-[0.06em] text-fg uppercase no-underline [font-stretch:78%] hover:bg-fg hover:text-bg"
            >
              {section.ctaLabel} →
            </Link>
          )}
        </div>
      </Reveal>
    </Plate>
  );
}

/** Questions fréquentes : les étapes de la notice, numérotées, la réponse sous chacune. */
function Faq({ section }: SectionProps<'faq'>) {
  const items = faqItemsOf(section);
  if (items.length === 0) return null;
  return (
    <Plate title={section.title}>
      <Reveal className="max-w-4xl border-t-[1.5px] border-fg">
        {items.map((item, index) => (
          <details key={item.id} className="group border-b border-fg/25">
            <summary className="flex min-h-14 cursor-pointer list-none items-baseline gap-4 py-4 [&::-webkit-details-marker]:hidden">
              <span className="tabular font-heading text-2xl font-black [font-stretch:120%]">{index + 1}.</span>
              <span className="flex-1 font-heading text-xl font-black tracking-[-0.01em] uppercase [font-stretch:115%]">{item.question}</span>
              <span aria-hidden className="font-heading text-xl font-black transition-transform duration-300 group-open:rotate-45">
                <Plus className="size-[1em]" strokeWidth={2} />
              </span>
            </summary>
            <div className="flex flex-col gap-3 pb-6 pl-10 text-lg leading-relaxed">
              {paragraphsOf(item.answer).map((p, i) => (
                <p key={i} className="max-w-[62ch]">
                  {p}
                </p>
              ))}
            </div>
          </details>
        ))}
      </Reveal>
    </Plate>
  );
}

/** Contact : un tableau comme celui des mesures, une ligne par moyen de joindre la boutique. */
function Contact({ store, section }: SectionProps<'contact'>) {
  const lines = contactLines(store, section);
  if (!hasContact(section, lines)) return null;
  return (
    <Plate title={section.title}>
      <Reveal className="flex max-w-4xl flex-col gap-5">
        {section.subtitle && <p className="max-w-[56ch] text-lg leading-relaxed">{section.subtitle}</p>}
        <div className="overflow-x-auto border-y-[1.5px] border-fg">
          <table className="w-full border-collapse text-left">
            <tbody>
              {lines.map((line) => (
                <tr key={line.kind} className="border-b border-fg/15 last:border-0">
                  <th scope="row" className="px-3 py-3 font-heading text-sm font-bold tracking-[0.08em] uppercase [font-stretch:80%]">
                    {line.action}
                  </th>
                  <td className="px-3 py-3">
                    <a
                      href={line.href}
                      target={line.kind === 'whatsapp' ? '_blank' : undefined}
                      rel={line.kind === 'whatsapp' ? 'noreferrer' : undefined}
                      className="tabular inline-flex min-h-11 items-center font-heading text-lg font-black break-all [font-stretch:110%] decoration-primary decoration-2 underline-offset-4 hover:underline"
                    >
                      {line.value}
                    </a>
                  </td>
                </tr>
              ))}
              {section.address && (
                <tr className="border-b border-fg/15 last:border-0">
                  <th scope="row" className="px-3 py-3 font-heading text-sm font-bold tracking-[0.08em] uppercase [font-stretch:80%]">
                    Adresse
                  </th>
                  <td className="px-3 py-3 text-lg">{section.address}</td>
                </tr>
              )}
              {section.hours && (
                <tr>
                  <th scope="row" className="px-3 py-3 font-heading text-sm font-bold tracking-[0.08em] uppercase [font-stretch:80%]">
                    Horaires
                  </th>
                  <td className="px-3 py-3 text-lg">{section.hours}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Reveal>
    </Plate>
  );
}

export function HomeSections({ site, store }: { site: string; store: StorefrontStoreDto }) {
  return (
    <SectionList store={store}>
      {(section) => {
        switch (section.type) {
          case 'hero':
            return <Hero site={site} store={store} section={section} />;
          case 'featured-collection':
            return <FeaturedCollection site={site} store={store} section={section} />;
          case 'product-grid':
            return <ProductGridSection site={site} store={store} section={section} />;
          case 'brand-strip':
            return <BrandStrip site={site} store={store} section={section} />;
          case 'rich-text':
            return <RichText site={site} store={store} section={section} />;
          case 'image-text':
            return <ImageText site={site} store={store} section={section} />;
          case 'faq':
            return <Faq site={site} store={store} section={section} />;
          case 'contact':
            return <Contact site={site} store={store} section={section} />;
          default:
            return null;
        }
      }}
    </SectionList>
  );
}
