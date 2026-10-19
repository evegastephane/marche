import type { Section, StorefrontStoreDto } from '@marche/contracts';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getBrands, getProducts } from '@/lib/storefront-api';
import {
  contactLines,
  faqItemsOf,
  featuredSelection,
  hasContact,
  paragraphsOf,
  SectionList,
  sectionImage,
} from '../shared/home-sections';
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
  const selection = await featuredSelection(site, store, section);
  if (!selection) return null;
  return (
    <SectionShell
      title={selection.title}
      action={
        <Link href={selection.href} className={seeAll}>
          Tout voir{' '}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      }
    >
      <ProductGrid products={selection.products} currency={store.currency} />
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

/** Une photo à côté d'un titre et d'un texte ; la photo passe à droite si le marchand le choisit. */
function ImageText({ store, section }: SectionProps<'image-text'>) {
  const image = sectionImage(store, section.imageMediaId);
  const paragraphs = paragraphsOf(section.body);
  if (!image && paragraphs.length === 0 && !section.title) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
      <Reveal className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        {image && (
          <div
            className={`aspect-[4/3] overflow-hidden rounded-3xl bg-surface ${section.imagePosition === 'right' ? 'lg:order-2' : ''}`}
          >
            <img {...imageProps(image, '(min-width: 1024px) 50vw, 100vw')} className="size-full object-cover" />
          </div>
        )}
        <div className="flex flex-col items-start gap-5">
          {section.title && <h2 className="text-2xl font-bold sm:text-3xl">{section.title}</h2>}
          {paragraphs.map((p, i) => (
            <p key={i} className="max-w-[60ch] text-lg leading-relaxed text-fg/85">
              {p}
            </p>
          ))}
          {section.ctaLabel && (
            <Link
              href={section.ctaHref ?? '/collections'}
              className="group mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary no-underline transition-transform duration-300 ease-out-soft hover:-translate-y-0.5 active:scale-[0.97]"
            >
              {section.ctaLabel}
              <span aria-hidden className="transition-transform duration-300 ease-out-soft group-hover:translate-x-1">
                →
              </span>
            </Link>
          )}
        </div>
      </Reveal>
    </section>
  );
}

/** Questions fréquentes : chaque réponse se déplie sous sa question, même sans JavaScript. */
function Faq({ section }: SectionProps<'faq'>) {
  const items = faqItemsOf(section);
  if (items.length === 0) return null;
  return (
    <SectionShell title={section.title}>
      <Reveal className="max-w-3xl border-t border-line">
        {items.map((item) => (
          <details key={item.id} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xl leading-none transition-transform duration-300 ease-out-soft group-open:rotate-45"
              >
                <Plus className="size-[1em]" strokeWidth={2} />
              </span>
            </summary>
            <div className="flex flex-col gap-3 pb-6 text-fg/80">
              {paragraphsOf(item.answer).map((p, i) => (
                <p key={i} className="max-w-[65ch] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </details>
        ))}
      </Reveal>
    </SectionShell>
  );
}

/** Contact : WhatsApp d'abord (le canal des clients), puis l'appel et l'e-mail, l'adresse et les horaires. */
function Contact({ store, section }: SectionProps<'contact'>) {
  const lines = contactLines(store, section);
  if (!hasContact(section, lines)) return null;
  return (
    <SectionShell>
      <Reveal className="grid gap-8 rounded-3xl bg-surface p-6 text-on-surface sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="flex flex-col gap-4">
          {section.title && <h2 className="text-2xl font-bold sm:text-3xl">{section.title}</h2>}
          {section.subtitle && <p className="max-w-[46ch] text-lg opacity-80">{section.subtitle}</p>}
          <ContactDetails section={section} />
        </div>
        {lines.length > 0 && (
          <ul className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <li key={line.kind}>
                <a
                  href={line.href}
                  target={line.kind === 'whatsapp' ? '_blank' : undefined}
                  rel={line.kind === 'whatsapp' ? 'noreferrer' : undefined}
                  className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 no-underline transition-transform duration-300 ease-out-soft hover:-translate-y-0.5 ${
                    index === 0 ? 'bg-primary text-on-primary' : 'bg-bg text-fg ring-1 ring-line'
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{line.action}</span>
                    <span className="truncate text-sm opacity-75">{line.value}</span>
                  </span>
                  <span aria-hidden>→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </SectionShell>
  );
}

function ContactDetails({ section }: { section: SectionProps<'contact'>['section'] }) {
  if (!section.address && !section.hours) return null;
  return (
    <dl className="mt-2 grid gap-3 text-sm">
      {section.address && (
        <div>
          <dt className="font-semibold">Adresse</dt>
          <dd className="opacity-80">{section.address}</dd>
        </div>
      )}
      {section.hours && (
        <div>
          <dt className="font-semibold">Horaires</dt>
          <dd className="opacity-80">{section.hours}</dd>
        </div>
      )}
    </dl>
  );
}

/** Rendu des sections de l'accueil, dans l'ordre choisi par le marchand (Composite). */
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
            // La lettre d'information attend un fournisseur d'e-mailing : pas encore rendue.
            return null;
        }
      }}
    </SectionList>
  );
}
