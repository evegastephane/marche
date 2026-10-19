'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';
import { DASHBOARD_URL, SIGN_IN_URL, signUpUrl } from '@/lib/platform';
import { useLanding } from './state';

const NAV = [
  { href: '#stock', label: 'Stock' },
  { href: '#caisse', label: 'Caisse' },
  { href: '#fonctions', label: 'Fonctions' },
];

/** En-tête de nuit : transparent sur la devanture, voilé dès qu'on défile. Sa touche s'allume quand les autres sortent. */
export function LandingHeader() {
  const { storeName, headerLit } = useLanding();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? 'bg-[#09090b]/90 shadow-[0_1px_0_rgb(255_244_235/0.07)] backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[78rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/"
            className="inline-flex items-center gap-[0.32em] text-[1.3rem] text-[var(--ul-ink)] no-underline"
            aria-label="Upsell, accueil"
          >
            <UpsellMark intro className="h-[1.18em] w-auto" />
            <span className="max-sm:hidden">
              <UpsellWordmark className="translate-y-[0.14em]" />
            </span>
          </Link>
          <nav
            aria-label="Rubriques"
            className="flex items-center max-lg:hidden"
          >
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="ul-ghost">
                {item.label}
              </a>
            ))}
            <Link href="/developers" className="ul-ghost">
              Développeurs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <a href={SIGN_IN_URL} className="ul-ghost">
            Se connecter
          </a>
          <a
            href={signUpUrl(storeName)}
            className="ul-cta"
            data-size="sm"
            data-lit={headerLit}
          >
            Créer ma boutique
          </a>
        </div>
      </div>
    </header>
  );
}

const LINKS = [
  { href: '#stock', label: 'Stock' },
  { href: '#caisse', label: 'Caisse' },
  { href: '#fonctions', label: 'Fonctions' },
  { href: '/developers', label: 'Développeurs' },
  { href: '/confidentialite', label: 'Confidentialité' },
];

/** Pied de page de nuit. */
export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--ul-line)] bg-[var(--ul-night)]">
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-10">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-[0.32em] text-[1.375rem] text-[var(--ul-ink)]">
            <UpsellMark className="h-[1.18em] w-auto" />
            <UpsellWordmark className="translate-y-[0.14em]" />
          </span>
          <span className="ul-small">
            Des boutiques en ligne tenues par leur stock.
          </span>
        </div>
        <nav
          aria-label="Pages Upsell"
          className="flex flex-wrap gap-x-6 gap-y-3 text-[0.875rem]"
        >
          {LINKS.map((link) =>
            link.href.startsWith('#') ? (
              <a
                key={link.href}
                href={link.href}
                className="font-[560] text-[var(--ul-ink-2)] no-underline transition-colors hover:text-[var(--ul-ink)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="font-[560] text-[var(--ul-ink-2)] no-underline transition-colors hover:text-[var(--ul-ink)]"
              >
                {link.label}
              </Link>
            ),
          )}
          <a
            href={DASHBOARD_URL}
            className="inline-flex items-center gap-1 font-[560] text-[var(--ul-ink-2)] no-underline transition-colors hover:text-[var(--ul-ink)]"
          >
            Tableau de bord
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </a>
        </nav>
      </div>
    </footer>
  );
}
