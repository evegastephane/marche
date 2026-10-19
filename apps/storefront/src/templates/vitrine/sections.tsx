import type { Section, StorefrontStoreDto } from '@marche/contracts';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, formatMoney } from '@/lib/format';
import { getBrands, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { Reveal } from '../default/components/motion';
import { ProductGrid } from './product-card';
import { PriceTag } from './tag';
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
  const selection = await featuredSelection(site, store, section);
  if (!selection) return null;
  return (
    <Shelf
      title={selection.title}
      action={
        <Link href={selection.href} className={seeAll}>
          Tout voir →
        </Link>
      }
    >
      <ProductGrid products={selection.products} currency={store.currency} />
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

/** La photo derrière la vitre, le texte à côté et l'étiquette qui mène à la vitrine. */
function ImageText({ store, section }: SectionProps<'image-text'>) {
  const image = sectionImage(store, section.imageMediaId);
  const paragraphs = paragraphsOf(section.body);
  if (!image && paragraphs.length === 0 && !section.title) return null;
  return (
    <Shelf title={section.title}>
      <Reveal className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {image && (
          <div className={cn('aspect-[4/3] overflow-hidden rounded-md border border-line', section.imagePosition === 'right' && 'lg:order-2')}>
            <img {...imageProps(image, '(min-width: 1024px) 45vw, 100vw')} alt={image.alt ?? ''} className="size-full object-cover" />
          </div>
        )}
        <div className="flex flex-col items-start gap-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="max-w-[56ch] text-lg leading-relaxed text-fg/85">
              {p}
            </p>
          ))}
          {section.ctaLabel && (
            <Link href={section.ctaHref ?? '/collections'} className="mt-2 no-underline">
              <PriceTag size="lg" className="transition-transform duration-300 ease-out-soft hover:-rotate-2">
                {section.ctaLabel} →
              </PriceTag>
            </Link>
          )}
        </div>
      </Reveal>
    </Shelf>
  );
}

/** Questions fréquentes : des plaques de verre, une question gravée sur chacune. */
function Faq({ section }: SectionProps<'faq'>) {
  const items = faqItemsOf(section);
  if (items.length === 0) return null;
  return (
    <Shelf title={section.title}>
      <Reveal className="flex max-w-4xl flex-col gap-3">
        {items.map((item) => (
          <details key={item.id} className="group rounded-md border border-line bg-surface text-on-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 font-heading text-lg font-bold tracking-wide uppercase [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden className="text-2xl leading-none text-primary transition-transform duration-300 ease-out-soft group-open:rotate-45">
                <Plus className="size-[1em]" strokeWidth={2} />
              </span>
            </summary>
            <div className="flex flex-col gap-3 px-5 pb-5 text-lg leading-relaxed opacity-85">
              {paragraphsOf(item.answer).map((p, i) => (
                <p key={i} className="max-w-[62ch]">
                  {p}
                </p>
              ))}
            </div>
          </details>
        ))}
      </Reveal>
    </Shelf>
  );
}

/** Contact : l'étiquette de WhatsApp accrochée en grand, les autres moyens sur leurs plaques. */
function Contact({ store, section }: SectionProps<'contact'>) {
  const lines = contactLines(store, section);
  if (!hasContact(section, lines)) return null;
  const [first, ...others] = lines;
  return (
    <Shelf title={section.title}>
      <Reveal className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          {section.subtitle && <p className="max-w-[44ch] text-lg text-muted">{section.subtitle}</p>}
          {section.address && <p className="font-heading text-lg font-bold tracking-wide uppercase">{section.address}</p>}
          {section.hours && <p className="text-muted">{section.hours}</p>}
        </div>
        {first && (
          <div className="flex flex-col items-start gap-4">
            <a href={first.href} target={first.kind === 'whatsapp' ? '_blank' : undefined} rel={first.kind === 'whatsapp' ? 'noreferrer' : undefined} className="no-underline">
              <PriceTag size="lg" className="-rotate-2 transition-transform duration-300 ease-out-soft hover:rotate-0">
                {first.action} →
              </PriceTag>
            </a>
            <ul className="flex w-full flex-col gap-3">
              {others.map((line) => (
                <li key={line.kind}>
                  <a
                    href={line.href}
                    className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-line bg-surface px-5 py-3 text-on-surface no-underline hover:border-primary"
                  >
                    <span className="font-heading font-bold tracking-wide uppercase">{line.action}</span>
                    <span className="tabular truncate text-sm opacity-80">{line.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Reveal>
    </Shelf>
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
