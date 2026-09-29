import type { StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';

const navLink =
  'inline-flex min-h-11 items-center px-3 font-heading text-[0.9375rem] font-bold tracking-[0.06em] text-fg uppercase no-underline [font-stretch:78%] decoration-primary decoration-2 underline-offset-[0.4em] hover:underline';

/**
 * Bandeau d'éditeur de l'enveloppe : le nom de la boutique en grande grotesque large, les catalogues
 * séparés par des filets, le panier compté dans une case. Double filet d'imprimerie en pied.
 */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = navLinks(store);
  return (
    <header className="sticky top-0 z-30 border-b-[5px] border-double border-fg bg-bg">
      {announcement.enabled && announcement.text && (
        <p className="bg-fg px-4 py-1.5 text-center text-sm font-semibold tracking-wide text-bg">{announcement.text}</p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="min-w-0 text-fg no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-9 w-auto" />
          ) : (
            <span className="block truncate font-heading text-xl leading-none font-black tracking-[-0.02em] uppercase [font-stretch:125%] sm:text-2xl">
              {store.name}
            </span>
          )}
        </Link>
        <nav aria-label="Catalogues" className="hidden flex-1 items-center justify-end divide-x divide-fg/30 md:flex">
          <Link href="/collections" className={navLink}>
            Tous les modèles
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={navLink}>
              {c.title}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2.5 font-heading text-[0.9375rem] font-bold tracking-[0.06em] text-fg uppercase no-underline [font-stretch:78%] md:ml-3"
        >
          Panier
          <span className="tabular inline-flex h-8 min-w-8 items-center justify-center border-[1.5px] border-fg px-1.5 font-body text-sm font-bold tracking-normal">
            {cartCount}
            <span className="sr-only"> {cartCount > 1 ? 'articles' : 'article'}</span>
          </span>
        </Link>
      </div>
      {collections.length > 0 && (
        <nav aria-label="Catalogues" className="flex overflow-x-auto border-t border-fg/30 px-1 [scrollbar-width:none] md:hidden">
          <Link href="/collections" className={`${navLink} shrink-0`}>
            Tous les modèles
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

/** Dos de l'enveloppe : les coordonnées de la maison, imprimées sur le papier du patron. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-24 border-t-[5px] border-double border-fg bg-surface text-on-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
        <div className="flex flex-col gap-3">
          <span className="font-heading text-3xl leading-none font-black tracking-[-0.02em] uppercase [font-stretch:125%]">{store.name}</span>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="tabular text-lg font-semibold text-on-surface">
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
    </footer>
  );
}
