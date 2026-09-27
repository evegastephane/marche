import type { StorefrontStoreDto } from '@marche/contracts';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { imageProps } from './media';
import { CartCount } from './motion';
import { UpsellMark } from '@/components/upsell-mark';

/** Lien du menu : un trait se déroule sous le libellé au survol. */
const navLink =
  "relative text-fg/75 no-underline transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out-soft after:content-[''] hover:text-fg hover:after:scale-x-100";

/** Menu du téléphone : des cibles d'au moins 40 px de haut, faciles au pouce. */
const mobileNavLink =
  'inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-fg/80 no-underline active:bg-soft';

/** En-tête : annonce, nom ou logo de la boutique, catalogues, panier avec son compteur. */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const collections = store.navigation.collections.slice(0, 5);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/75">
      {announcement.enabled && announcement.text && (
        <p className="bg-accent px-4 py-2 text-center text-sm font-semibold text-on-accent">{announcement.text}</p>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="min-w-0 text-fg no-underline md:max-w-[40%] md:shrink-0">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-9 w-auto" />
          ) : (
            <span className="block truncate font-heading text-xl font-bold tracking-tight">{store.name}</span>
          )}
        </Link>
        <nav aria-label="Catalogues" className="hidden flex-1 items-center gap-5 text-sm md:flex">
          <Link href="/collections" className={navLink}>
            Tous les produits
          </Link>
          {collections.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className={navLink}>
              {c.title}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="group relative ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-fg no-underline transition-colors duration-200 hover:bg-soft"
        >
          <ShoppingBag
            className="size-5 transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5"
            aria-hidden
          />
          <span className="max-sm:sr-only">Panier</span>
          <CartCount count={cartCount} />
        </Link>
      </div>
      {collections.length > 0 && (
        <nav
          aria-label="Catalogues"
          className="flex gap-1 overflow-x-auto border-t border-line px-2 py-1 text-sm [scrollbar-width:none] md:hidden"
        >
          <Link href="/collections" className={mobileNavLink}>
            Tous les produits
          </Link>
          {collections.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className={mobileNavLink}>
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
              {store.contactEmail && (
                <a href={`mailto:${store.contactEmail}`} className="text-muted">
                  {store.contactEmail}
                </a>
              )}
              {store.phone && (
                <a href={`tel:${store.phone}`} className="text-muted">
                  {store.phone}
                </a>
              )}
            </p>
          )}
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          Boutique propulsée par
          <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
            <UpsellMark className="h-4 w-auto" />
            Upsell
          </span>
        </p>
      </div>
    </footer>
  );
}
