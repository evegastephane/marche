'use client';

/*
 * Adapté de « Magnet » de React Bits (https://reactbits.dev), © 2026 David Haz,
 * licence MIT + Commons Clause (voir ./LICENSE.md).
 * Ici : l'attraction passe par gsap.quickTo (aucun rendu React par mouvement de souris), seulement avec un
 * pointeur précis et le mouvement complet ; au doigt, la touche reste à sa place.
 */

import { type ReactNode, useRef } from 'react';
import { gsap, useGSAP } from '../gsap';

export function Magnet({
  children,
  className = '',
  padding = 70,
  strength = 3.2,
}: {
  children: ReactNode;
  className?: string;
  /** Distance (px) autour de la touche où elle commence à suivre le pointeur. */
  padding?: number;
  /** Plus la valeur est grande, plus la touche résiste. */
  strength?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        '(pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const target = inner.current;
          const frame = wrap.current;
          if (!target || !frame) return;
          const toX = gsap.quickTo(target, 'x', {
            duration: 0.5,
            ease: 'power3.out',
          });
          const toY = gsap.quickTo(target, 'y', {
            duration: 0.5,
            ease: 'power3.out',
          });
          const move = (event: PointerEvent) => {
            const rect = frame.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const near =
              Math.abs(event.clientX - cx) < rect.width / 2 + padding &&
              Math.abs(event.clientY - cy) < rect.height / 2 + padding;
            toX(near ? (event.clientX - cx) / strength : 0);
            toY(near ? (event.clientY - cy) / strength : 0);
          };
          window.addEventListener('pointermove', move, { passive: true });
          return () => window.removeEventListener('pointermove', move);
        },
      );
      return () => media.revert();
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className={`relative inline-flex ${className}`}>
      <div ref={inner} className="inline-flex w-full">
        {children}
      </div>
    </div>
  );
}
