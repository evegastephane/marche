import './portal.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PortalNav } from '@/components/developers/portal-nav';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';
import { hanken } from '@/lib/platform-font';

export const metadata: Metadata = {
  title: { default: 'Développeurs · Upsell', template: '%s · Développeurs Upsell' },
  description: 'Branchez n’importe quel site, application ou serveur sur une boutique Upsell : clés pk_ et sk_, référence des API.',
  icons: { icon: '/favicon.svg' },
};

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5173';

export default function DevelopersLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${hanken.className} up-portal flex flex-col`}>
      <header className="sticky top-0 z-30 border-b border-[var(--up-line)] bg-[var(--up-canvas)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/developers" className="flex items-center gap-3 no-underline" aria-label="Upsell Développeurs, accueil">
            <span className="inline-flex items-center gap-[0.32em] text-[1.25rem] text-[var(--up-ink)]">
              <UpsellMark className="h-[1.18em] w-auto" />
              <span className="max-sm:hidden">
                <UpsellWordmark className="translate-y-[0.14em]" />
              </span>
            </span>
            <span aria-hidden className="h-5 w-px bg-[var(--up-line-strong)] max-sm:hidden" />
            <span className="up-legend max-sm:hidden">Développeurs</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <PortalNav />
            <a href={DASHBOARD_URL} className="up-key max-lg:hidden" data-variant="ghost" data-size="sm">
              Tableau de bord
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[var(--up-line)]">
        <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[0.8125rem] text-[var(--up-ink-2)] sm:px-6 lg:px-10">
          <span>Upsell · API v1</span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="up-link font-[560]">
              Upsell
            </Link>
            <Link href="/confidentialite" className="up-link font-[560]">
              Confidentialité
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
