import type { StorefrontStoreDto } from '@marche/contracts';
import Link from 'next/link';
import { UpsellMark } from '@/components/upsell-mark';
import { imageProps } from '../default/components/media';
import { navLinks } from '../shared';

/** Mois du numéro : celui du jour (« septembre 2026 »). */
export function issueMonth(date = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
}

const rubric =
  'inline-flex min-h-11 shrink-0 items-center font-heading text-[1.0625rem] leading-none font-extrabold tracking-[0.03em] text-fg uppercase no-underline decoration-primary decoration-[3px] underline-offset-[0.35em] hover:underline';

/**
 * Bandeau de tête des pages intérieures : le nom du magazine à gauche, les rubriques,
 * le panier compté dans la pastille de seconde couleur. Un trait épais le sépare de la page.
 */
export function Header({ store, cartCount }: { store: StorefrontStoreDto; cartCount: number }) {
  const { announcement } = store.theme;
  const rubrics = navLinks(store);
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-fg bg-bg">
      {announcement.enabled && announcement.text && (
        <p className="bg-accent px-4 py-2 text-center font-heading text-base leading-tight font-extrabold tracking-[0.02em] text-on-accent uppercase">
          {announcement.text}
        </p>
      )}
      <div className="mx-auto flex h-16 max-w-[88rem] items-center gap-8 px-4 sm:px-8">
        <Link href="/" className="min-w-0 text-fg no-underline">
          {store.logo ? (
            <img {...imageProps(store.logo, '160px')} alt={store.name} className="h-9 w-auto" />
          ) : (
            <span className="block truncate font-heading text-[1.75rem] leading-none font-black tracking-[-0.01em] uppercase">{store.name}</span>
          )}
        </Link>
        <nav aria-label="Rubriques" className="hidden flex-1 items-center gap-6 md:flex">
          <Link href="/collections" className={rubric}>
            Tous les articles
          </Link>
          {rubrics.map((r) => (
            <Link key={r.key} href={r.href} className={rubric}>
              {r.title}
            </Link>
          ))}
        </nav>
        <Link href="/cart" className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2.5 font-heading text-[1.0625rem] font-extrabold tracking-[0.03em] text-fg uppercase no-underline">
          Panier
          <span className="tabular inline-flex size-9 items-center justify-center rounded-full bg-surface font-heading text-lg font-black text-on-surface">
            {cartCount}
            <span className="sr-only"> {cartCount > 1 ? 'articles' : 'article'}</span>
          </span>
        </Link>
      </div>
      <nav aria-label="Rubriques" className="flex gap-6 overflow-x-auto border-t-2 border-fg px-4 [scrollbar-width:none] md:hidden">
        <Link href="/collections" className={rubric}>
          Tous les articles
        </Link>
        {rubrics.map((r) => (
          <Link key={r.key} href={r.href} className={rubric}>
            {r.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/** L'ours du magazine : un aplat d'encre, le nom de la boutique, le numéro, les coordonnées. */
export function Footer({ store }: { store: StorefrontStoreDto }) {
  return (
    <footer className="mt-28 bg-fg text-bg">
      <div className="mx-auto grid max-w-[88rem] gap-10 px-4 pt-14 pb-12 sm:px-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div className="flex flex-col gap-3">
          <p className="font-heading text-[clamp(3rem,7vw,5.5rem)] leading-[0.82] font-black tracking-[-0.02em] uppercase">{store.name}</p>
          <p className="text-base">Le numéro de {issueMonth()}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-base">
          {store.phone && (
            <>
              <dt className="font-heading font-extrabold tracking-[0.04em] uppercase">Tél.</dt>
              <dd>
                <a href={`tel:${store.phone}`} className="tabular text-bg">
                  {store.phone}
                </a>
              </dd>
            </>
          )}
          {store.contactEmail && (
            <>
              <dt className="font-heading font-extrabold tracking-[0.04em] uppercase">E-mail</dt>
              <dd className="min-w-0 break-words">
                <a href={`mailto:${store.contactEmail}`} className="text-bg">
                  {store.contactEmail}
                </a>
              </dd>
            </>
          )}
        </dl>
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <Link href="/confidentialite" className="text-bg">
            Confidentialité
          </Link>
          <p className="inline-flex items-center gap-2">
            Boutique propulsée par
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <UpsellMark className="h-4 w-auto" />
              Upsell
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
