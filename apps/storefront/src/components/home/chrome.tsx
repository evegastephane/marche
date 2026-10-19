'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';
import { DASHBOARD_URL, SIGN_IN_URL, signUpUrl } from '@/lib/platform';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap';
import { useHome } from './state';

const NAV = [
  { href: '#gerez', label: 'Dashboard' },
  { href: '#publiez', label: 'Site' },
  { href: '#caisse', label: 'Caisse' },
  { href: '#campagnes', label: 'WhatsApp' },
];

/** En-tête fin : transparent en haut, voilé ensuite ; il s'efface quand on descend et revient quand on remonte. */
export function HomeHeader() {
  const { storeName } = useHome();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const header = root.current;
      if (!header) return;
      ScrollTrigger.create({
        start: 24,
        end: 'max',
        onToggle: (self) =>
          header.toggleAttribute('data-scrolled', self.isActive),
      });
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const show = gsap.quickTo(header, 'yPercent', {
          duration: 0.45,
          ease: 'power3.out',
        });
        ScrollTrigger.create({
          start: 400,
          end: 'max',
          onUpdate: (self) =>
            show(self.direction === 1 && self.isActive ? -110 : 0),
          onLeaveBack: () => show(0),
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <header ref={root} className="uh-header">
      <div className="uh-container flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-9">
          <Link
            href="/"
            className="inline-flex items-center gap-[0.3em] text-[1.35rem] text-[var(--uh-ink)] no-underline"
            aria-label="Upsell, accueil"
          >
            <UpsellMark intro className="h-[1.15em] w-auto" />
            <span className="max-sm:hidden">
              <UpsellWordmark className="translate-y-[0.14em]" />
            </span>
          </Link>
          <nav
            aria-label="Chapitres"
            className="flex items-center gap-1 max-lg:hidden"
          >
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="uh-nav">
                {item.label}
              </a>
            ))}
            <Link href="/developers" className="uh-nav">
              Développeurs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <a href={SIGN_IN_URL} className="uh-nav">
            Se connecter
          </a>
          <a href={signUpUrl(storeName)} className="uh-cta" data-size="sm">
            Créer ma boutique
          </a>
        </div>
      </div>
    </header>
  );
}

const LINKS = [
  { href: '/developers', label: 'Développeurs' },
  { href: '/confidentialite', label: 'Confidentialité' },
];

export function HomeFooter() {
  return (
    <footer className="relative z-[2] border-t border-[var(--uh-line)] bg-[var(--uh-bg)]">
      <div className="uh-container flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
        <span className="inline-flex items-center gap-[0.3em] text-[1.25rem] text-[var(--uh-ink)]">
          <UpsellMark className="h-[1.15em] w-auto" />
          <UpsellWordmark className="translate-y-[0.14em]" />
        </span>
        <nav
          aria-label="Pages Upsell"
          className="flex flex-wrap gap-x-7 gap-y-3 text-[0.875rem]"
        >
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="uh-footer-link">
              {link.label}
            </Link>
          ))}
          <a
            href={DASHBOARD_URL}
            className="uh-footer-link inline-flex items-center gap-1"
          >
            Tableau de bord{' '}
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </a>
        </nav>
      </div>
    </footer>
  );
}
