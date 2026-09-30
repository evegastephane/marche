'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/developers', label: 'Démarrage' },
  { href: '/developers/reference', label: 'Référence' },
  { href: '/developers/keys', label: 'Mes clés' },
] as const;

/** Sélecteur du portail : un rail en creux, un curseur qui glisse vers la rubrique ouverte. */
export function PortalNav() {
  const pathname = usePathname();
  const active = LINKS.findLast((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))?.href;
  return (
    <nav aria-label="Portail Développeurs" className="up-well up-rail">
      {LINKS.map((link) => {
        const current = link.href === active;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? 'page' : undefined}
            className={`relative inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[0.8125rem] font-[580] no-underline transition-colors max-md:h-10 max-sm:px-2.5 ${
              current ? 'text-[var(--up-ink)]' : 'text-[var(--up-ink-2)] hover:text-[var(--up-ink)]'
            }`}
          >
            {current && (
              <motion.span
                layoutId="portal-nav"
                className="up-knob absolute inset-0 rounded-lg"
                transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
              />
            )}
            <span className="relative">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
