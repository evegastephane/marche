'use client';

import {
  ArrowRight,
  Barcode,
  Building2,
  FileSpreadsheet,
  LayoutTemplate,
  type LucideIcon,
  Smartphone,
  Undo2,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap';

/** Une seule bande, et seulement ce qui existe dans le produit. */
const ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Barcode, label: 'Numéros IMEI' },
  { icon: FileSpreadsheet, label: 'Import Excel' },
  { icon: Smartphone, label: 'Mobile Money en caisse' },
  { icon: Undo2, label: 'Retours et avoirs' },
  { icon: LayoutTemplate, label: 'Huit modèles de site' },
  { icon: UsersRound, label: 'Équipe et rôles' },
  { icon: Building2, label: 'Plusieurs boutiques' },
];

/**
 * « Tout le reste » : une bande qui défile. Le défilement de la page l'accélère, et change son sens quand on
 * remonte.
 */
export function Rest() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const loops = gsap.utils
          .toArray<HTMLElement>('[data-marquee]')
          .map((track) =>
            gsap.fromTo(
              track,
              { xPercent: 0 },
              { xPercent: -50, duration: 40, ease: 'none', repeat: -1 },
            ),
          );
        let boost: gsap.core.Timeline = gsap.timeline();
        ScrollTrigger.create({
          trigger: root.current,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            const speed = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
            boost.kill();
            boost = gsap.timeline();
            for (const loop of loops) {
              boost.to(
                loop,
                {
                  timeScale: speed === 0 ? 1 : speed,
                  duration: 0.2,
                  ease: 'power1.out',
                },
                0,
              );
              boost.to(
                loop,
                {
                  timeScale: Math.sign(speed || 1),
                  duration: 1.6,
                  ease: 'power2.out',
                },
                0.25,
              );
            }
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="flex flex-col">
      <div className="uh-marquee">
        <ul data-marquee className="flex w-max gap-4">
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              className="uh-pill"
              aria-hidden={i >= ITEMS.length ? true : undefined}
            >
              <item.icon
                className="size-[1.1em] text-[var(--uh-orange)]"
                strokeWidth={1.8}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <Link href="/developers" className="uh-link mt-8 self-center text-[1rem]">
        Portail Développeurs{' '}
        <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}
