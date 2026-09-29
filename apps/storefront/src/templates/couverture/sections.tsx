import type { Currency, Section, StorefrontProductCardDto, StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, formatMoney } from '@/lib/format';
import { getBrands, getCollections, getProducts } from '@/lib/storefront-api';
import { imageProps } from '../default/components/media';
import { issueMonth } from './chrome';
import { Masthead } from './masthead';
import { PageCard, PagesGrid } from './product-card';

interface SectionProps<T extends Section['type']> {
  site: string;
  store: StorefrontStoreDto;
  section: Extract<Section, { type: T }>;
}

const more =
  'inline-flex min-h-11 items-center font-heading text-[1.125rem] font-extrabold tracking-[0.03em] uppercase no-underline decoration-[3px] underline-offset-[0.3em] hover:underline';
const rubricTitle = 'font-heading text-[clamp(3rem,7.5vw,6rem)] leading-[0.82] font-black tracking-[-0.02em] text-balance uppercase';

/** Une rubrique : un bloc coupé net, son titre en très grand, séparé du suivant par un vide franc. */
function Rubric({ title, action, className, children }: { title?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn('mt-28 sm:mt-36', className)}>
      <div className="mx-auto flex max-w-[88rem] flex-col gap-10 px-4 sm:px-8">
        {(title || action) && (
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            {title && <h2 className={rubricTitle}>{title}</h2>}
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** Un titre de couverture : le nom de la pièce en capitales serrées, son prix dans la pastille de seconde couleur. */
function CoverLine({ product, currency }: { product: StorefrontProductCardDto; currency: Currency }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col items-start gap-2.5 text-on-accent no-underline">
      <span className="font-heading text-[clamp(1.75rem,2.5vw,2.5rem)] leading-[0.88] font-black tracking-[-0.01em] text-balance uppercase decoration-[0.09em] underline-offset-[0.12em] group-hover:underline">
        {product.title}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="tabular bg-surface px-2 py-1 text-[0.9375rem] leading-none font-bold text-on-surface">
          {product.priceMinAmount !== product.priceMaxAmount && 'dès '}
          {formatMoney(product.priceMinAmount, currency)}
        </span>
        {onSale && (
          <s className="tabular text-sm opacity-85">
            <span className="sr-only">au lieu de </span>
            {formatMoney(product.compareAtAmount!, currency)}
          </s>
        )}
      </span>
    </Link>
  );
}

/**
 * La une : sur l'aplat de la couleur de couverture, le nom de la boutique en titre de magazine,
 * la pièce la plus récente en photo de couverture (jamais recouverte), les autres en titres autour,
 * et « Feuilleter » dans le coin qu'on corne.
 */
async function Cover({ site, store, section }: SectionProps<'hero'>) {
  const latest = await getProducts(site, store.id, { sort: 'newest', limit: 7 });
  // La photo choisie par la boutique fait la couverture ; sinon, la pièce la plus récente qui a une photo.
  const heroImage = section.imageMediaId ? (store.themeMedia[section.imageMediaId] ?? null) : null;
  const lead = heroImage ? null : (latest.items.find((p) => p.image) ?? latest.items[0] ?? null);
  const lines = latest.items.filter((p) => p.id !== lead?.id).slice(0, 4);
  const floor = latest.items.length > 0 ? Math.min(...latest.items.map((p) => p.priceMinAmount)) : null;
  const coverImage = heroImage ?? lead?.image ?? null;
  const coverHref = lead ? `/products/${lead.slug}` : (section.ctaHref ?? '/collections');

  return (
    <section className="relative overflow-hidden bg-accent text-on-accent">
      <div className="mx-auto flex max-w-[88rem] flex-col px-4 pt-5 pb-44 sm:px-8 sm:pt-7 lg:pb-36">
        <Masthead name={store.name} as="h1" />
        <p className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-y-[3px] border-current py-2 font-heading text-[1rem] leading-tight font-extrabold tracking-[0.04em] uppercase sm:text-[1.125rem]">
          <span>Le numéro de {issueMonth()}</span>
          {floor !== null && <span className="tabular">Dans ce numéro, dès {formatMoney(floor, store.currency)}</span>}
        </p>

        <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
          <div className="order-2 flex flex-col gap-10 lg:order-1">
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-[clamp(3.25rem,6vw,5.75rem)] leading-[0.82] font-black tracking-[-0.02em] text-balance uppercase [font-variation-settings:'opsz'_72]">
                {section.title}
              </h2>
              {section.subtitle && <p className="max-w-[34ch] text-lg leading-snug font-medium">{section.subtitle}</p>}
            </div>
            {lines.slice(0, 2).map((product) => (
              <CoverLine key={product.id} product={product} currency={store.currency} />
            ))}
          </div>

          {(lead || coverImage) && (
            <div className="order-1 flex flex-col gap-3 lg:order-2">
              <Link href={coverHref} className="relative block text-on-accent no-underline" aria-label={lead?.title ?? section.title}>
                <span className="relative block aspect-[4/5] overflow-hidden bg-[color-mix(in_oklab,currentColor_10%,transparent)]">
                  {coverImage ? (
                    <img
                      {...imageProps(coverImage, '(min-width: 1024px) 38vw, 100vw')}
                      alt={coverImage.alt ?? lead?.title ?? ''}
                      fetchPriority="high"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-end p-6 font-heading text-6xl leading-[0.84] font-black uppercase">{lead?.title}</span>
                  )}
                </span>
                {lead && (
                  <span className="absolute -top-5 -right-3 flex size-28 rotate-[-9deg] flex-col items-center justify-center gap-1 rounded-full bg-surface text-center text-on-surface shadow-[0_10px_22px_-12px_rgb(0_0_0/0.55)] sm:-right-6 sm:size-32">
                    <span className="font-heading text-[1.375rem] leading-none font-black uppercase sm:text-[1.625rem]">Nouveauté</span>
                    <span className="tabular text-[0.8125rem] leading-none font-bold">{formatMoney(lead.priceMinAmount, store.currency)}</span>
                  </span>
                )}
              </Link>
              {lead && (
                <p className="text-[0.9375rem] leading-snug">
                  <span className="font-semibold">En couverture :</span> {lead.title}
                  {lead.brand && `, ${lead.brand.name}`}
                </p>
              )}
            </div>
          )}

          <div className="order-3 flex flex-col gap-10">
            {lines.slice(2).map((product) => (
              <CoverLine key={product.id} product={product} currency={store.currency} />
            ))}
          </div>
        </div>
      </div>

      {section.ctaLabel && (
        <Link href={section.ctaHref ?? '/collections'} className="dog-ear absolute right-0 bottom-0 text-on-surface no-underline">
          <span className="dog-ear-label font-heading leading-[0.9] font-black uppercase">{section.ctaLabel} →</span>
        </Link>
      )}
    </section>
  );
}

/** À la une : un encadré pleine largeur dans la seconde couleur, le dossier du numéro et ses pièces. */
async function FeaturedCollection({ site, store, section }: SectionProps<'featured-collection'>) {
  if (!section.collectionId) return null;
  const collections = await getCollections(site, store.id);
  const collection = collections.find((c) => c.id === section.collectionId);
  if (!collection) return null;
  const products = await getProducts(site, store.id, { collection: collection.slug, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <section className="mt-28 bg-surface text-on-surface sm:mt-36">
      <div className="mx-auto grid max-w-[88rem] gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-6 lg:sticky lg:top-28 lg:self-start">
          <h2 className={rubricTitle}>{section.title || collection.title}</h2>
          {section.title && section.title !== collection.title && <p className="font-heading text-2xl leading-none font-extrabold uppercase">{collection.title}</p>}
          <Link href={`/collections/${collection.slug}`} className={cn(more, 'text-on-surface')}>
            Tout le dossier →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 md:grid-cols-3">
          {products.items.slice(0, 6).map((product) => (
            <li key={product.id}>
              <PageCard product={product} currency={store.currency} sizes="(min-width: 1024px) 18vw, 50vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function ProductGridSection({ site, store, section }: SectionProps<'product-grid'>) {
  const products = await getProducts(site, store.id, { sort: section.sort, limit: section.limit });
  if (products.items.length === 0) return null;
  return (
    <Rubric
      title={section.title}
      action={
        <Link href="/collections" className={cn(more, 'text-fg')}>
          Tous les articles →
        </Link>
      }
    >
      <PagesGrid products={products.items} currency={store.currency} feature />
    </Rubric>
  );
}

async function BrandStrip({ site, store, section }: SectionProps<'brand-strip'>) {
  const brands = await getBrands(site, store.id);
  if (brands.length === 0) return null;
  return (
    <Rubric title={section.title}>
      <ul className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        {brands.map((brand, i) => (
          <li key={brand.slug} className="font-heading text-[clamp(2rem,4vw,3.25rem)] leading-none font-black uppercase">
            {i > 0 && (
              <span aria-hidden className="mr-5 text-primary">
                /
              </span>
            )}
            {brand.name}
          </li>
        ))}
      </ul>
    </Rubric>
  );
}

/** L'édito : le mot de la boutique, lettrine dans la couleur d'action, signé de son nom. */
function Editorial({ store, section }: SectionProps<'rich-text'>) {
  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <section className="mt-28 sm:mt-36">
      <div className="mx-auto grid max-w-[88rem] gap-8 border-t-[3px] border-fg px-4 pt-8 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <h2 className={rubricTitle}>{section.title}</h2>
        <div className="flex flex-col gap-5 text-xl leading-relaxed">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={cn(
                'max-w-[60ch]',
                i === 0 &&
                  'first-letter:float-left first-letter:mt-[0.06em] first-letter:mr-3 first-letter:font-heading first-letter:text-[5.25em] first-letter:leading-[0.72] first-letter:font-black first-letter:text-primary first-letter:uppercase',
              )}
            >
              {p}
            </p>
          ))}
          <p className="font-heading text-2xl leading-none font-black uppercase">{store.name}</p>
        </div>
      </div>
    </section>
  );
}

export function HomeSections({ site, store }: { site: string; store: StorefrontStoreDto }) {
  return (
    <div className="page-turn">
      {store.theme.sections
        .filter((section) => section.enabled)
        .map((section) => {
          switch (section.type) {
            case 'hero':
              return <Cover key={section.id} site={site} store={store} section={section} />;
            case 'featured-collection':
              return <FeaturedCollection key={section.id} site={site} store={store} section={section} />;
            case 'product-grid':
              return <ProductGridSection key={section.id} site={site} store={store} section={section} />;
            case 'brand-strip':
              return <BrandStrip key={section.id} site={site} store={store} section={section} />;
            case 'rich-text':
              return <Editorial key={section.id} site={site} store={store} section={section} />;
            default:
              return null;
          }
        })}
    </div>
  );
}
