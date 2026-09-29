import type { StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';

const sign =
  'brush-fill inline-flex min-h-11 shrink-0 items-center border-2 border-line bg-surface px-3 font-heading text-sm tracking-wide text-on-surface uppercase no-underline';

/**
 * Haut de la façade : le nom peint sur le mur, les rayons en petites enseignes accrochées,
 * le panier sur une plaque avec son compte.
 */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = navLinks(store);
  return (
    <header className="sticky top-0 z-30 border-b-4 border-line bg-bg">
      {announcement.enabled && announcement.text && (
        <p className="border-b-2 border-line bg-primary px-4 py-1.5 text-center font-heading text-sm tracking-wide text-on-primary uppercase">
          {announcement.text}
        </p>
      )}
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="min-w-0 text-fg no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-10 w-auto" />
          ) : (
            <span className="painted-shade block truncate font-heading text-2xl leading-none uppercase sm:text-[1.75rem]">{store.name}</span>
          )}
        </Link>
        <nav aria-label="Rayons" className="hidden flex-1 items-center justify-end gap-2.5 md:flex">
          <Link href="/collections" className={sign}>
            Tous les rayons
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={sign}>
              {c.title}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2.5 border-2 border-line bg-primary py-1 pr-1.5 pl-3 font-heading text-sm tracking-wide text-on-primary uppercase no-underline shadow-[3px_3px_0_var(--color-line)] transition-[transform,box-shadow] duration-150 hover:-translate-y-px md:ml-2"
        >
          Panier
          <span className="tabular inline-flex size-8 items-center justify-center rounded-full border-2 border-line bg-surface font-body text-sm font-bold text-on-surface">
            {cartCount}
            <span className="sr-only"> {cartCount > 1 ? 'articles' : 'article'}</span>
          </span>
        </Link>
      </div>
      {collections.length > 0 && (
        <nav aria-label="Rayons" className="flex gap-2 overflow-x-auto border-t-2 border-line px-4 py-2 [scrollbar-width:none] md:hidden">
          <Link href="/collections" className={sign}>
            Tous les rayons
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={sign}>
              {c.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Soubassement de la façade : la plaque avec les coordonnées de la boutique. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-24 border-t-4 border-line bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="painted-frame flex flex-col gap-8 bg-surface px-8 py-9 text-on-surface sm:flex-row sm:items-end sm:justify-between sm:px-10">
          <div className="flex flex-col gap-3">
            <span className="font-heading text-3xl leading-none uppercase">{store.name}</span>
            {store.phone && (
              <a href={`tel:${store.phone}`} className="tabular text-lg font-bold text-on-surface">
                {store.phone}
              </a>
            )}
            {store.contactEmail && (
              <a href={`mailto:${store.contactEmail}`} className="text-on-surface/80">
                {store.contactEmail}
              </a>
            )}
          </div>
          <div className="flex flex-col gap-3 text-sm sm:items-end">
            <Link href="/confidentialite" className="text-on-surface/80">
              Confidentialité
            </Link>
            <p className="inline-flex items-center gap-2 text-on-surface/80">
              Boutique propulsée par
              <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface">
                <UpsellMark className="h-4 w-auto" />
                Upsell
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
