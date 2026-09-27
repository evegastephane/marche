import type { StorefrontStoreDto } from '@marche/contracts';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { imageProps } from './media';

/** En-tête : annonce, nom ou logo de la boutique, catalogues, panier avec son compteur. */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = store.navigation.collections.slice(0, 5);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/92 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      {announcement.enabled && announcement.text && (
        <p className="bg-accent px-4 py-2 text-center text-sm font-semibold text-on-accent">{announcement.text}</p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="min-w-0 shrink-0 text-fg no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-9 w-auto" />
          ) : (
            <span className="truncate font-heading text-xl font-bold tracking-tight">{store.name}</span>
          )}
        </Link>
        <nav aria-label="Catalogues" className="hidden flex-1 items-center gap-5 text-sm md:flex">
          <Link href="/collections" className="text-fg/80 no-underline hover:text-fg">
            Tous les produits
          </Link>
          {collections.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="text-fg/80 no-underline hover:text-fg">
              {c.title}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="relative ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-fg no-underline hover:bg-soft"
        >
          <ShoppingBag className="size-5" aria-hidden />
          <span className="max-sm:sr-only">Panier</span>
          {cartCount > 0 && (
            <span className="tabular inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
      {collections.length > 0 && (
        <nav aria-label="Catalogues" className="flex gap-4 overflow-x-auto border-t border-line px-4 py-2.5 text-sm md:hidden">
          <Link href="/collections" className="shrink-0 text-fg/80 no-underline">
            Tous les produits
          </Link>
          {collections.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="shrink-0 text-fg/80 no-underline">
              {c.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="font-heading text-lg font-bold">{store.name}</span>
          {(store.contactEmail || store.phone) && (
            <p className="flex flex-col text-sm text-muted">
              {store.contactEmail && <a href={`mailto:${store.contactEmail}`} className="text-muted">{store.contactEmail}</a>}
              {store.phone && <a href={`tel:${store.phone}`} className="text-muted">{store.phone}</a>}
            </p>
          )}
        </div>
        <p className="text-sm text-muted">
          Boutique propulsée par <span className="font-semibold text-fg">Baobab</span>
        </p>
      </div>
    </footer>
  );
}
