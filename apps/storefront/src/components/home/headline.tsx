'use client';

import { createElement, useRef } from 'react';
import {
  EASE,
  gsap,
  MOTION_OK,
  MOTION_REDUCED,
  SplitText,
  useGSAP,
} from './gsap';

/**
 * Titre de chapitre : chaque ligne finit par une roue orange en guise de point (la roue du chariot Upsell).
 * Les lettres montent de sous leur ligne, puis la roue arrive en roulant et s'arrête au bout de la phrase.
 * Le texte est visible sans JavaScript ; les lecteurs d'écran lisent un vrai point.
 */
export function Headline({
  as = 'h2',
  lines,
  id,
  className,
  onLoad = false,
  delay = 0,
  thread = false,
}: {
  as?: 'h1' | 'h2';
  lines: string[];
  id?: string;
  className?: string;
  /** Jouée au chargement (accroche) plutôt qu'à l'entrée dans l'écran. */
  onLoad?: boolean;
  delay?: number;
  /** La roue finale sert de repère au fil orange (thread.tsx). */
  thread?: boolean;
}) {
  const root = useRef<HTMLHeadingElement>(null);
  const played = useRef(false);

  useGSAP(
    () => {
      const heading = root.current;
      if (!heading) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_REDUCED, () => {
        gsap.set(heading, { visibility: 'visible' });
      });

      mm.add(MOTION_OK, () => {
        const wheels = heading.querySelectorAll<HTMLElement>('[data-wheel]');
        const split = SplitText.create(
          heading.querySelectorAll('[data-words]'),
          {
            type: 'words,chars',
            mask: 'words',
            autoSplit: true,
            onSplit(self) {
              gsap.set(heading, { visibility: 'visible' });
              if (played.current) return;
              const tl = gsap.timeline({
                delay,
                scrollTrigger: onLoad
                  ? undefined
                  : { trigger: heading, start: 'top 84%', once: true },
                onComplete: () => {
                  played.current = true;
                },
              });
              tl.from(
                self.chars,
                {
                  yPercent: 118,
                  rotate: 6,
                  duration: 1.15,
                  ease: EASE,
                  stagger: 0.022,
                },
                0,
              );
              wheels.forEach((wheel, index) => {
                const size = wheel.getBoundingClientRect().width || 20;
                const distance = size * 9;
                tl.from(
                  wheel,
                  {
                    x: distance,
                    rotation: (distance / (size / 2)) * (180 / Math.PI),
                    autoAlpha: 0,
                    duration: 1.25,
                    ease: 'power3.out',
                  },
                  0.35 + index * 0.18,
                );
              });
              return tl;
            },
          },
        );
        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return createElement(
    as,
    { ref: root, id, className: `uh-kinetic ${className ?? ''}` },
    lines.map((line, index) => (
      <span key={line} className="uh-kinetic-line">
        <span data-words>{line}</span>
        <span
          className="uh-wheel-slot"
          data-thread={
            thread && index === lines.length - 1 ? 'wheel' : undefined
          }
        >
          <Wheel />
        </span>
        <span className="sr-only">.</span>
        {index < lines.length - 1 ? ' ' : null}
      </span>
    )),
  );
}

/** Roue du chariot, à la taille d'un point : disque orange, moyeu et repère pour qu'on la voie tourner. */
export function Wheel({ className }: { className?: string }) {
  return (
    <svg
      data-wheel
      aria-hidden
      viewBox="0 0 20 20"
      className={`uh-wheel ${className ?? ''}`}
    >
      <circle cx="10" cy="10" r="10" fill="var(--uh-orange)" />
      <circle cx="10" cy="10" r="2.4" fill="var(--uh-hole, var(--uh-bg))" />
      <circle cx="10" cy="4.4" r="1.05" fill="var(--uh-hole, var(--uh-bg))" />
    </svg>
  );
}
