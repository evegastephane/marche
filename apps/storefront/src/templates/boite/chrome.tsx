import type { StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';

const navLink =
  'inline-flex min-h-11 items-center text-sm font-medium tracking-[0.04em] text-muted no-underline transition-colors hover:text-fg';

/** En-tête du carton : le nom de la boutique imprimé en capitales espacées, les rayons, le panier compté dans une case. */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = navLinks(store);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      {announcement.enabled && announcement.text && (
        <p className="border-b border-line bg-surface px-4 py-1.5 text-center font-hand text-xs tracking-[0.12em] text-on-surface uppercase">
          {announcement.text}
        </p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" className="min-w-0 text-fg no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-8 w-auto" />
          ) : (
            <span className="block truncate text-base font-normal tracking-[0.32em] uppercase sm:text-lg">{store.name}</span>
          )}
        </Link>
        <nav aria-label="Rayons" className="hidden flex-1 items-center gap-6 md:flex">
          <Link href="/collections" className={navLink}>
            Tous les appareils
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={navLink}>
              {c.title}
            </Link>
          ))}
        </nav>
        <Link href="/cart" className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2.5 text-sm font-medium text-fg no-underline">
          Panier
          <span className="tabular inline-flex h-7 min-w-7 items-center justify-center border-[1.5px] border-fg px-1 font-hand text-xs">
            {cartCount}
            <span className="sr-only"> {cartCount > 1 ? 'articles' : 'article'}</span>
          </span>
        </Link>
      </div>
      {collections.length > 0 && (
        <nav aria-label="Rayons" className="flex gap-6 overflow-x-auto border-t border-line px-4 [scrollbar-width:none] md:hidden">
          <Link href="/collections" className={`${navLink} shrink-0`}>
            Tous les appareils
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={`${navLink} shrink-0`}>
              {c.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Pied : l'étiquette de la boutique, ses coordonnées en caractères d'étiquette. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
        <div className="flex flex-col gap-3">
          <span className="text-lg tracking-[0.32em] uppercase">{store.name}</span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-hand text-sm">
            {store.phone && (
              <>
                <dt className="text-muted uppercase">Tél.</dt>
                <dd>
                  <a href={`tel:${store.phone}`} className="tabular text-fg">
                    {store.phone}
                  </a>
                </dd>
              </>
            )}
            {store.contactEmail && (
              <>
                <dt className="text-muted uppercase">E-mail</dt>
                <dd>
                  <a href={`mailto:${store.contactEmail}`} className="text-fg">
                    {store.contactEmail}
                  </a>
                </dd>
              </>
            )}
          </dl>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:items-end">
          <Link href="/confidentialite" className="text-muted hover:text-fg">
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
