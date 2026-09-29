import type { StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';
import { LedMarquee } from './led';
import { Segments } from './segments';

/** Ce que dit l'enseigne : seulement des vérités (nom, annonce, rayons, services activés, téléphone). */
function signItems(store: StorefrontStoreDto): string[] {
  const services = store.services;
  const { announcement } = store.theme;
  return [
    store.name,
    announcement.enabled && announcement.text ? announcement.text : null,
    ...store.navigation.collections.slice(0, 5).map((c) => c.title),
    services?.warranty && services.warranty.defaultMonths > 0 ? `Garantie ${services.warranty.defaultMonths} mois` : null,
    services?.tradeIn ? 'Reprise de votre ancien appareil' : null,
    services?.returns ? `Retour sous ${services.returns.days} jours` : null,
    services?.serialNumbers ? 'IMEI noté sur votre commande' : null,
    store.phone ? `Tél. ${store.phone}` : null,
  ].filter((item): item is string => Boolean(item));
}

const navLink = 'inline-flex min-h-11 shrink-0 items-center text-[0.9375rem] font-bold text-muted no-underline transition-colors hover:text-fg';

/**
 * La devanture : l'enseigne qui défile en haut (elle part avec la page), puis la barre de la boutique,
 * qui reste : le nom, les rayons, et le panier compté sur un petit afficheur.
 */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const links = navLinks(store);
  const count = String(Math.min(cartCount, 99)).padStart(2, '_');
  return (
    <>
      <LedMarquee items={signItems(store)} />
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
          <Link href="/" className="min-w-0 text-fg no-underline">
            {store.logo ? (
              <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-8 w-auto" />
            ) : (
              <span className="block truncate text-base font-bold tracking-[0.16em] uppercase sm:text-lg">{store.name}</span>
            )}
          </Link>
          <nav aria-label="Rayons" className="hidden flex-1 items-center gap-7 md:flex">
            <Link href="/collections" className={navLink}>
              Tous les appareils
            </Link>
            {links.map((l) => (
              <Link key={l.key} href={l.href} className={navLink}>
                {l.title}
              </Link>
            ))}
          </nav>
          <Link href="/cart" className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-3 text-[0.9375rem] font-bold text-fg no-underline">
            Panier
            <span className="led-board led-glow inline-flex h-9 items-center rounded-[4px] border border-line px-2 text-[1.375rem]">
              <Segments text={count} />
              <span className="sr-only">
                {cartCount} {cartCount > 1 ? 'articles' : 'article'}
              </span>
            </span>
          </Link>
        </div>
        {links.length > 0 && (
          <nav aria-label="Rayons" className="flex gap-6 overflow-x-auto border-t border-line px-4 [scrollbar-width:none] md:hidden">
            <Link href="/collections" className={navLink}>
              Tous les appareils
            </Link>
            {links.map((l) => (
              <Link key={l.key} href={l.href} className={navLink}>
                {l.title}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}

/** Le bas de la devanture : le nom en points LED, les coordonnées lisibles, les mentions. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="led-board">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="led-text led-glow text-[clamp(2.25rem,6vw,4.5rem)] leading-none font-extrabold uppercase">{store.name}</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[0.9375rem]">
          {store.phone && (
            <>
              <dt className="font-bold text-muted">Téléphone</dt>
              <dd>
                <a href={`tel:${store.phone}`} className="tabular font-bold text-fg">
                  {store.phone}
                </a>
              </dd>
            </>
          )}
          {store.contactEmail && (
            <>
              <dt className="font-bold text-muted">E-mail</dt>
              <dd className="min-w-0 break-words">
                <a href={`mailto:${store.contactEmail}`} className="text-fg">
                  {store.contactEmail}
                </a>
              </dd>
            </>
          )}
        </dl>
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
