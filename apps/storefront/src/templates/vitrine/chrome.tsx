import type { StorefrontStoreDto } from '@marche/contracts';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';

const navLink =
  'inline-flex min-h-11 items-center font-heading text-[0.9375rem] font-semibold tracking-wide text-muted uppercase no-underline transition-colors hover:text-fg';

/**
 * En-tête de la vitrine : l'enseigne lumineuse au nom de la boutique, les rayons,
 * le panier compté sur une petite étiquette.
 */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = navLinks(store);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/92 backdrop-blur-md">
      {announcement.enabled && announcement.text && (
        <p className="bg-primary px-4 py-1.5 text-center font-heading text-sm font-bold tracking-wide text-on-primary uppercase">
          {announcement.text}
        </p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="min-w-0 no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-9 w-auto" />
          ) : (
            <span className="block truncate rounded-md border border-line bg-surface px-3 py-1 font-heading text-xl font-extrabold tracking-wide text-fg uppercase shadow-[inset_0_0_18px_color-mix(in_oklab,var(--color-primary)_22%,transparent),0_0_24px_-10px_var(--color-primary)]">
              {store.name}
            </span>
          )}
        </Link>
        <nav aria-label="Rayons" className="hidden flex-1 items-center gap-6 md:flex">
          <Link href="/collections" className={navLink}>
            Toute la vitrine
          </Link>
          {collections.map((c) => (
            <Link key={c.key} href={c.href} className={navLink}>
              {c.title}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 font-heading text-base font-bold tracking-wide text-fg uppercase no-underline"
        >
          <ShoppingBag className="size-5" aria-hidden />
          <span className="max-sm:sr-only">Panier</span>
          <span className="tabular inline-flex h-6 min-w-6 items-center justify-center bg-primary pr-1.5 pl-2.5 text-sm text-on-primary [clip-path:polygon(0.4rem_0,100%_0,100%_100%,0.4rem_100%,0_50%)]">
            {cartCount}
            <span className="sr-only"> {cartCount > 1 ? 'articles' : 'article'}</span>
          </span>
        </Link>
      </div>
      {collections.length > 0 && (
        <nav aria-label="Rayons" className="flex gap-5 overflow-x-auto border-t border-line px-4 [scrollbar-width:none] md:hidden">
          <Link href="/collections" className={`${navLink} shrink-0`}>
            Toute la vitrine
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

/** Pied du comptoir : les coordonnées de la boutique. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface text-on-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="font-heading text-2xl font-extrabold tracking-wide uppercase">{store.name}</span>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="tabular font-heading text-lg font-semibold text-on-surface">
              {store.phone}
            </a>
          )}
          {store.contactEmail && (
            <a href={`mailto:${store.contactEmail}`} className="text-sm text-on-surface/80">
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
