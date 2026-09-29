import type { StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';

const tab =
  'inline-flex min-h-11 items-center px-1 font-heading text-[0.8125rem] font-semibold tracking-[0.08em] text-fg uppercase no-underline [font-stretch:82%] decoration-accent decoration-2 underline-offset-[0.45em] hover:underline';

/**
 * En-tête du cahier : le nom de la boutique écrit au stylo, les catalogues en onglets imprimés,
 * le panier compté au stylo.
 */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = navLinks(store);
  return (
    <header className="sticky top-0 z-30 border-b-2 border-double border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      {announcement.enabled && announcement.text && (
        <p className="border-b border-line px-4 py-1.5 text-center font-hand text-base text-accent">{announcement.text}</p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-baseline gap-2 text-fg no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-9 w-auto" />
          ) : (
            <span className="truncate font-hand text-[1.625rem] leading-none font-bold text-accent">{store.name}</span>
          )}
        </Link>
        <nav aria-label="Catalogues" className="hidden flex-1 items-center justify-end gap-5 md:flex">
          <Link href="/collections" className={tab}>
            Tous les modèles
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={tab}>
              {c.title}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 font-heading text-sm font-bold tracking-[0.08em] text-fg uppercase no-underline [font-stretch:82%] md:ml-2"
        >
          Panier
          <span className="relative inline-flex min-w-7 items-center justify-center font-hand text-lg leading-none font-bold tracking-normal text-accent normal-case">
            {cartCount}
            <svg viewBox="0 0 40 30" aria-hidden className="pointer-events-none absolute -inset-1.5 size-[calc(100%+0.75rem)] overflow-visible">
              <path
                d="M 24 3 C 12 1, 3 7, 4 15 C 5 24, 19 28, 29 25 C 38 22, 39 12, 33 7 C 29 3, 22 2, 16 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="sr-only"> {cartCount > 1 ? 'articles' : 'article'}</span>
          </span>
        </Link>
      </div>
      {collections.length > 0 && (
        <nav aria-label="Catalogues" className="flex gap-4 overflow-x-auto border-t border-line px-4 [scrollbar-width:none] md:hidden">
          <Link href="/collections" className={`${tab} shrink-0`}>
            Tous les modèles
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={`${tab} shrink-0`}>
              {c.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Dernière page du cahier : les coordonnées de l'atelier, écrites au stylo. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="ruled-paper mt-24 border-t-2 border-double border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-[1fr_auto] sm:px-6 sm:pl-20">
        <div className="flex flex-col gap-3">
          <p className="font-hand text-3xl leading-none font-bold text-accent">{store.name}</p>
          {(store.phone || store.contactEmail) && (
            <dl className="flex flex-col gap-1 text-sm">
              {store.phone && (
                <div className="flex items-baseline gap-2">
                  <dt className="font-heading font-semibold tracking-[0.08em] uppercase [font-stretch:82%]">Tél.</dt>
                  <dd>
                    <a href={`tel:${store.phone}`} className="font-hand text-lg text-accent">
                      {store.phone}
                    </a>
                  </dd>
                </div>
              )}
              {store.contactEmail && (
                <div className="flex items-baseline gap-2">
                  <dt className="font-heading font-semibold tracking-[0.08em] uppercase [font-stretch:82%]">E-mail</dt>
                  <dd>
                    <a href={`mailto:${store.contactEmail}`} className="font-hand text-lg text-accent">
                      {store.contactEmail}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <div className="flex flex-col gap-3 text-sm sm:items-end">
          <Link href="/confidentialite" className="text-muted">
            Confidentialité
          </Link>
          <p className="inline-flex items-center gap-2 text-muted">
            Boutique propulsée par
            <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
              <UpsellMark className="h-4 w-auto" />
              Upsell
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
