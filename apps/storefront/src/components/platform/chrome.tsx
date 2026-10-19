import Link from 'next/link';
import type { ReactNode } from 'react';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';
import { DASHBOARD_URL } from '@/lib/platform';
import { ThemeSwitch } from './theme-switch';

/** En-tête commun des pages de la plateforme : logo (accueil), rubrique éventuelle, touches à droite. */
export function PlatformHeader({
  section,
  children,
}: {
  section?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--up-line)] bg-[var(--up-canvas)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-[0.32em] text-[1.25rem] text-[var(--up-ink)] no-underline"
            aria-label="Upsell, accueil"
          >
            <UpsellMark className="h-[1.18em] w-auto" />
            <span className="max-sm:hidden">
              <UpsellWordmark className="translate-y-[0.14em]" />
            </span>
          </Link>
          {section && (
            <>
              <span
                aria-hidden
                className="h-5 w-px bg-[var(--up-line-strong)] max-sm:hidden"
              />
              <span className="up-legend max-sm:hidden">{section}</span>
            </>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {children}
        </div>
      </div>
    </header>
  );
}

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/#fonctions', label: 'Fonctions' },
  { href: '/developers', label: 'Développeurs' },
  { href: '/confidentialite', label: 'Confidentialité' },
];

/** Pied de page commun : la marque, les pages de la plateforme, l'accès au tableau de bord. */
export function PlatformFooter() {
  return (
    <footer className="border-t border-[var(--up-line)]">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-[0.32em] text-[1.125rem] text-[var(--up-ink)]">
            <UpsellMark className="h-[1.18em] w-auto" />
            <UpsellWordmark className="translate-y-[0.14em]" />
          </span>
          <span className="text-[0.875rem] text-[var(--up-ink-2)]">
            Des boutiques en ligne tenues par leur stock.
          </span>
        </div>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
          <nav
            aria-label="Pages Upsell"
            className="flex flex-wrap gap-x-6 gap-y-3 text-[0.875rem]"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="up-link font-[560]"
              >
                {link.label}
              </Link>
            ))}
            <a href={DASHBOARD_URL} className="up-link font-[560]">
              Tableau de bord
            </a>
          </nav>
          <ThemeSwitch />
        </div>
      </div>
    </footer>
  );
}
