import type { Section, StorefrontStoreDto } from '@marche/contracts';
import { Plus, Scissors } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { Reveal } from '../default/components/motion';
import { ProductGrid } from './product-card';
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
  const selection = await featuredSelection(site, store, section);
  if (!selection) return null;
  return (
    <Page
      title={selection.title}
      action={
        <Link href={selection.href} className={seeAll}>
          tout voir →
        </Link>
      }
    >
      <ProductGrid products={selection.products} currency={store.currency} />
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

/** Une photo collée au ruban dans le cahier, la note écrite au stylo à côté, sur les lignes. */
function ImageText({ store, section }: SectionProps<'image-text'>) {
  const image = sectionImage(store, section.imageMediaId);
  const paragraphs = paragraphsOf(section.body);
  if (!image && paragraphs.length === 0 && !section.title) return null;
  const right = section.imagePosition === 'right';
  return (
    <Page title={section.title}>
      <Reveal className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {image && (
          <div
            className={cn(
              'relative mx-auto w-[86%] max-w-md bg-surface p-3 pb-5 shadow-[0_2px_2px_rgb(0_0_0/0.06),0_24px_40px_-18px_rgb(0_0_0/0.45)]',
              right ? 'rotate-[2deg] lg:order-2' : '-rotate-[2deg]',
            )}
          >
            <span aria-hidden className="tape top-0 left-6 z-10 -translate-y-1/2 -rotate-12" />
            <div className="aspect-[4/5] overflow-hidden">
              <img {...imageProps(image, '(min-width: 1024px) 40vw, 86vw')} alt={image.alt ?? ''} className="size-full object-cover" />
            </div>
          </div>
        )}
        <div className="flex flex-col items-start gap-8">
          {paragraphs.length > 0 && (
            <div className="ruled-paper -mx-4 flex flex-col gap-8 self-stretch px-4 py-2 font-hand text-[1.375rem] leading-[2rem] text-accent sm:mx-0 sm:pl-20">
              {paragraphs.map((p, i) => (
                <p key={i} className="max-w-[52ch]">
                  {p}
                </p>
              ))}
            </div>
          )}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="group relative inline-flex min-h-14 items-center gap-3 border-l-2 border-dashed border-fg/40 bg-surface pr-6 pl-5 font-heading font-bold tracking-[0.08em] text-fg uppercase no-underline shadow-[0_10px_22px_-14px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-out-soft [font-stretch:82%] hover:-translate-y-0.5"
            >
              <Scissors className="size-5 -rotate-90 text-primary" strokeWidth={1.8} aria-hidden />
              {section.ctaLabel}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          )}
        </div>
      </Reveal>
    </Page>
  );
}

/** Questions fréquentes : la question imprimée, la réponse écrite au stylo dessous, sur les lignes. */
function Faq({ section }: SectionProps<'faq'>) {
  const items = faqItemsOf(section);
  if (items.length === 0) return null;
  return (
    <Page title={section.title}>
      <Reveal className="flex max-w-4xl flex-col">
        {items.map((item) => (
          <details key={item.id} className="group border-b border-fg/30">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-heading text-xl font-extrabold uppercase [font-stretch:80%] [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden className="font-hand text-3xl leading-none text-accent transition-transform duration-300 ease-out-soft group-open:rotate-45">
                <Plus className="size-[1em]" strokeWidth={2} />
              </span>
            </summary>
            <div className="ruled-paper -mx-4 flex flex-col gap-4 px-4 pb-6 font-hand text-[1.3rem] leading-[2rem] text-accent sm:mx-0 sm:pl-20">
              {paragraphsOf(item.answer).map((p, i) => (
                <p key={i} className="max-w-[60ch]">
                  {p}
                </p>
              ))}
            </div>
          </details>
        ))}
      </Reveal>
    </Page>
  );
}

/** Contact : le bon à découper de l'atelier, chaque moyen de joindre sur sa ligne, écrit au stylo. */
function Contact({ store, section }: SectionProps<'contact'>) {
  const lines = contactLines(store, section);
  if (!hasContact(section, lines)) return null;
  return (
    <Page title={section.title}>
      <Reveal className="relative max-w-3xl border-2 border-dashed border-fg/40 bg-surface p-6 shadow-[0_18px_32px_-22px_rgb(0_0_0/0.5)] sm:p-10">
        <Scissors aria-hidden className="absolute -top-3 left-8 size-6 bg-surface px-0.5 text-primary" strokeWidth={1.8} />
        {section.subtitle && <p className="mb-6 max-w-[46ch] -rotate-[0.6deg] font-hand text-2xl leading-snug text-accent">{section.subtitle}</p>}
        <dl className="flex flex-col">
          {lines.map((line) => (
            <div key={line.kind} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-fg/30 py-3">
              <dt className="font-heading text-sm font-semibold tracking-[0.14em] uppercase [font-stretch:80%]">{line.action}</dt>
              <dd>
                <a
                  href={line.href}
                  target={line.kind === 'whatsapp' ? '_blank' : undefined}
                  rel={line.kind === 'whatsapp' ? 'noreferrer' : undefined}
                  className="inline-flex min-h-11 items-center font-hand text-2xl font-bold text-accent decoration-2 underline-offset-4 hover:underline"
                >
                  {line.value}
                </a>
              </dd>
            </div>
          ))}
          {section.address && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-fg/30 py-3">
              <dt className="font-heading text-sm font-semibold tracking-[0.14em] uppercase [font-stretch:80%]">Adresse</dt>
              <dd className="font-hand text-2xl text-accent">{section.address}</dd>
            </div>
          )}
          {section.hours && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
              <dt className="font-heading text-sm font-semibold tracking-[0.14em] uppercase [font-stretch:80%]">Horaires</dt>
              <dd className="font-hand text-2xl text-accent">{section.hours}</dd>
            </div>
          )}
        </dl>
      </Reveal>
    </Page>
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
