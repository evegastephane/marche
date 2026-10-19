import type { Section, StorefrontStoreDto } from '@marche/contracts';
import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, formatMoney } from '@/lib/format';
import { getBrands, getProducts } from '@/lib/storefront-api';
import { Reveal } from '../default/components/motion';
import { BoxFront, Tick } from './box';
import { ProductGrid } from './product-card';
import { imageProps } from '../default/components/media';
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

const seeAll = 'inline-flex min-h-11 items-center text-sm font-medium text-fg no-underline decoration-primary decoration-2 underline-offset-[0.4em] hover:underline';

/** Un rayon : son titre imprimé sur le carton, les boîtes en pile dessous. */
function Shelf({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-20 sm:px-6 sm:pt-24">
      {(title || action) && (
        <Reveal className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          {title && <h2 className="text-3xl leading-none font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h2>}
          {action}
        </Reveal>
      )}
      {children}
    </section>
  );
}

/**
 * Première vue : la boîte de l'appareil vedette de face, et à côté son étiquette dépliée,
 * le titre d'accueil en tête, les arrivages cochés ligne à ligne avec leur prix, puis le bouton.
 */
async function Hero({ site, store, section }: SectionProps<'hero'>) {
  const latest = await getProducts(site, store.id, { sort: 'newest', limit: 6 });
  const lead = latest.items.find((p) => p.image) ?? latest.items[0];
  const rows = latest.items.slice(0, 5);
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-16">
        {lead && (
          <Link href={`/products/${lead.slug}`} className="sf-rise group block pt-3.5 pr-3.5 text-fg no-underline" aria-label={lead.title}>
            <BoxFront
              image={lead.image}
              title={lead.title}
              brand={store.name}
              sizes="(min-width: 1024px) 45vw, 90vw"
              priority
              className="aspect-[5/6] transition-transform duration-700 ease-out-soft group-hover:[transform:perspective(1400px)_rotateY(-7deg)] motion-reduce:transition-none"
            />
          </Link>
        )}
        <div className="sf-rise flex flex-col gap-6 border border-line bg-surface p-6 text-on-surface [--sf-delay:140ms] sm:p-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-balance">{section.title}</h1>
            {section.subtitle && <p className="max-w-[46ch] text-lg leading-relaxed opacity-85">{section.subtitle}</p>}
          </div>
          {rows.length > 0 && (
            <ul className="flex flex-col divide-y divide-line border-y border-line font-hand text-sm">
              {rows.map((product) => (
                <li key={product.id}>
                  <Link href={`/products/${product.slug}`} className="flex min-h-12 items-center gap-3 py-2 text-on-surface no-underline hover:underline">
                    <Tick checked={product.id === lead?.id} />
                    <span className="min-w-0 flex-1 truncate uppercase">{product.title}</span>
                    <span className="tabular shrink-0 font-semibold text-primary">{formatMoney(product.priceMinAmount, store.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="inline-flex min-h-14 items-center justify-center gap-2 bg-primary px-8 text-base font-semibold text-on-primary no-underline shadow-[0_14px_26px_-16px_var(--color-primary)] transition-transform duration-200 hover:-translate-y-px"
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
    <Shelf
      title={selection.title}
      action={
        <Link href={selection.href} className={seeAll}>
          Tout le rayon →
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
          Tous les appareils →
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
        <ul className="flex flex-wrap gap-x-10 gap-y-3">
          {brands.map((brand) => (
            <li key={brand.slug} className="text-lg tracking-[0.28em] uppercase">
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
      <Reveal className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-[65ch]">
            {p}
          </p>
        ))}
      </Reveal>
    </Shelf>
  );
}

/** La photo de l'appareil hors de sa boîte, l'étiquette dépliée à côté : titre, texte, bouton. */
function ImageText({ store, section }: SectionProps<'image-text'>) {
  const image = sectionImage(store, section.imageMediaId);
  const paragraphs = paragraphsOf(section.body);
  if (!image && paragraphs.length === 0 && !section.title) return null;
  return (
    <Shelf>
      <Reveal className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-12">
        {image && (
          <div className={cn('border border-line bg-surface p-3', section.imagePosition === 'right' && 'lg:order-2')}>
            <div className="aspect-[4/3] overflow-hidden">
              <img {...imageProps(image, '(min-width: 1024px) 45vw, 100vw')} alt={image.alt ?? ''} className="size-full object-cover" />
            </div>
          </div>
        )}
        <div className="flex flex-col justify-center gap-6 border border-line bg-surface p-6 text-on-surface sm:p-8">
          {section.title && <h2 className="text-3xl leading-none font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{section.title}</h2>}
          {paragraphs.map((p, i) => (
            <p key={i} className="max-w-[56ch] text-lg leading-relaxed opacity-85">
              {p}
            </p>
          ))}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="inline-flex min-h-14 items-center justify-center gap-2 self-start bg-primary px-8 text-base font-semibold text-on-primary no-underline shadow-[0_14px_26px_-16px_var(--color-primary)] transition-transform duration-200 hover:-translate-y-px"
            >
              {section.ctaLabel} →
            </Link>
          )}
        </div>
      </Reveal>
    </Shelf>
  );
}

/** Questions fréquentes : la notice pliée dans la boîte, une question par ligne, cochée une fois ouverte. */
function Faq({ section }: SectionProps<'faq'>) {
  const items = faqItemsOf(section);
  if (items.length === 0) return null;
  return (
    <Shelf title={section.title}>
      <Reveal className="max-w-4xl divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item.id} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-3 font-hand text-[0.9375rem] uppercase [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="grid size-5 shrink-0 place-items-center border border-current text-xs leading-none">
                <Check className="hidden size-3.5 group-open:block" strokeWidth={2.5} />
              </span>
              <span className="flex-1">{item.question}</span>
              <span aria-hidden className="text-primary transition-transform duration-200 group-open:rotate-90">
                →
              </span>
            </summary>
            <div className="flex flex-col gap-3 pb-6 pl-9 text-lg leading-relaxed">
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

/** Contact : l'étiquette du service client, collée au dos de la boîte. */
function Contact({ store, section }: SectionProps<'contact'>) {
  const lines = contactLines(store, section);
  if (!hasContact(section, lines)) return null;
  return (
    <Shelf title={section.title}>
      <Reveal className="grid gap-6 border border-line bg-surface p-6 text-on-surface sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
        <div className="flex flex-col gap-4">
          {section.subtitle && <p className="max-w-[44ch] text-lg leading-relaxed opacity-85">{section.subtitle}</p>}
          {section.address && (
            <p className="font-hand text-sm uppercase">
              <span className="opacity-70">Adresse · </span>
              {section.address}
            </p>
          )}
          {section.hours && (
            <p className="font-hand text-sm uppercase">
              <span className="opacity-70">Horaires · </span>
              {section.hours}
            </p>
          )}
        </div>
        {lines.length > 0 && (
          <ul className="flex flex-col divide-y divide-line border-y border-line font-hand text-sm">
            {lines.map((line) => (
              <li key={line.kind}>
                <a
                  href={line.href}
                  target={line.kind === 'whatsapp' ? '_blank' : undefined}
                  rel={line.kind === 'whatsapp' ? 'noreferrer' : undefined}
                  className="flex min-h-14 items-center gap-3 py-2 text-on-surface no-underline hover:underline"
                >
                  <Tick checked={line.kind === 'whatsapp'} />
                  <span className="min-w-0 flex-1 uppercase">{line.action}</span>
                  <span className="tabular truncate font-semibold text-primary">{line.value}</span>
                </a>
              </li>
            ))}
          </ul>
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
