import type { Section, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, formatMoney } from '@/lib/format';
import { getBrands, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { PriceBoard, TileGrid } from './product-card';
import { SegmentPrice } from './segments';
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
  const selection = await featuredSelection(site, store, section);
  if (!selection) return null;
  return (
    <Aisle
      title={selection.title}
      action={
        <Link href={selection.href} className={seeAll}>
          Tout le rayon →
        </Link>
      }
    >
      <TileGrid products={selection.products} currency={store.currency} />
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

/** Une photo posée sur l'étal éclairé, le texte de la boutique à côté et le bouton allumé. */
function ImageText({ store, section }: SectionProps<'image-text'>) {
  const image = sectionImage(store, section.imageMediaId);
  const paragraphs = paragraphsOf(section.body);
  if (!image && paragraphs.length === 0 && !section.title) return null;
  return (
    <Aisle title={section.title}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {image && (
          <div className={cn('lit-shelf aspect-[5/4] overflow-hidden rounded-md p-6 sm:p-8', section.imagePosition === 'right' && 'lg:order-2')}>
            <img {...imageProps(image, '(min-width: 1024px) 45vw, 100vw')} alt={image.alt ?? ''} className="size-full rounded-sm object-cover" />
          </div>
        )}
        <div className="flex flex-col items-start gap-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="max-w-[56ch] text-lg leading-relaxed text-muted">
              {p}
            </p>
          ))}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="lit-button mt-2 inline-flex min-h-14 items-center justify-center rounded-md px-8 text-lg font-bold no-underline transition-transform duration-200 hover:-translate-y-px"
            >
              {section.ctaLabel} →
            </Link>
          )}
        </div>
      </div>
    </Aisle>
  );
}

/** Questions fréquentes : chaque ligne a son témoin, qui s'allume quand la réponse est ouverte. */
function Faq({ section }: SectionProps<'faq'>) {
  const items = faqItemsOf(section);
  if (items.length === 0) return null;
  return (
    <Aisle title={section.title}>
      <div className="max-w-4xl border-t border-line">
        {items.map((item) => (
          <details key={item.id} className="group border-b border-line">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-4 text-xl font-bold [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full bg-line transition-colors duration-300 group-open:bg-primary group-open:shadow-[0_0_14px_var(--color-primary)]"
              />
              <span className="flex-1 text-balance">{item.question}</span>
            </summary>
            <div className="flex flex-col gap-3 pb-6 pl-7 text-lg leading-relaxed text-muted">
              {paragraphsOf(item.answer).map((p, i) => (
                <p key={i} className="max-w-[62ch]">
                  {p}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Aisle>
  );
}

/** Contact : le comptoir, WhatsApp allumé en premier, les autres moyens sous l'étal. */
function Contact({ store, section }: SectionProps<'contact'>) {
  const lines = contactLines(store, section);
  if (!hasContact(section, lines)) return null;
  return (
    <Aisle title={section.title}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          {section.subtitle && <p className="max-w-[44ch] text-lg leading-relaxed text-muted">{section.subtitle}</p>}
          {section.hours && <p className="led-text text-2xl font-extrabold uppercase">{section.hours}</p>}
          {section.address && <p className="text-lg font-bold">{section.address}</p>}
        </div>
        {lines.length > 0 && (
          <ul className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <li key={line.kind}>
                <a
                  href={line.href}
                  target={line.kind === 'whatsapp' ? '_blank' : undefined}
                  rel={line.kind === 'whatsapp' ? 'noreferrer' : undefined}
                  className={cn(
                    'flex min-h-16 items-center justify-between gap-4 rounded-md px-6 py-3 no-underline transition-transform duration-200 hover:-translate-y-px',
                    i === 0 ? 'lit-button' : 'border border-line text-fg',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-lg font-bold">{line.action}</span>
                    <span className="tabular truncate text-sm opacity-80">{line.value}</span>
                  </span>
                  <span aria-hidden>→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Aisle>
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
