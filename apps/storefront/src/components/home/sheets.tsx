'use client';

import { gsap, MOTION_OK, useGSAP } from './gsap';

/**
 * Les feuilles blanches (chapitres `paper`) arrivent resserrées et arrondies, s'élargissent jusqu'aux bords quand
 * elles occupent l'écran, puis se resserrent en repartant : une carte posée sur la scène qui passe.
 */
export function SheetMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      for (const sheet of document.querySelectorAll<HTMLElement>(
        '[data-paper]',
      )) {
        gsap.fromTo(
          sheet,
          { '--uh-sheet-inset': '7vw', '--uh-sheet-radius': '64px' },
          {
            '--uh-sheet-inset': '1.25vw',
            '--uh-sheet-radius': '28px',
            ease: 'none',
            scrollTrigger: {
              trigger: sheet,
              start: 'top bottom',
              end: 'top 30%',
              scrub: 0.6,
            },
          },
        );
        gsap.fromTo(
          sheet,
          { '--uh-sheet-inset': '1.25vw', '--uh-sheet-radius': '28px' },
          {
            '--uh-sheet-inset': '7vw',
            '--uh-sheet-radius': '64px',
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: sheet,
              start: 'bottom 70%',
              end: 'bottom top',
              scrub: 0.6,
            },
          },
        );
      }
    });
    return () => mm.revert();
  });
  return null;
}
