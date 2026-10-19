'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from './gsap';

/**
 * Le bloc de code s'écrit ligne par ligne quand il arrive à l'écran, curseur au bout. Le texte complet est là
 * dès le rendu serveur : sans JavaScript ou mouvement réduit, on le lit tel quel.
 */
export function CodeReveal({ code }: { code: string }) {
  const block = useRef<HTMLPreElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(MOTION_OK, () => {
        gsap.from('[data-code-line]', {
          autoAlpha: 0,
          x: -10,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.11,
          scrollTrigger: {
            trigger: block.current,
            start: 'top 78%',
            once: true,
          },
        });
      });
      return () => media.revert();
    },
    { scope: block },
  );

  const lines = code.split('\n');
  return (
    <pre
      ref={block}
      className="ul-mono overflow-x-auto rounded-2xl bg-[var(--ul-glass)] p-6 text-[0.8125rem] leading-[1.7] text-[var(--ul-ink-2)] shadow-[inset_0_0_0_1px_var(--ul-line)]"
    >
      <code>
        {lines.map((line, index) => (
          <span key={index} data-code-line className="block min-h-[1.7em]">
            {line.startsWith('//') ? (
              <span className="text-[var(--ul-ink-3)]">{line}</span>
            ) : (
              line
            )}
            {index === lines.length - 1 && <span className="ul-type-caret" />}
          </span>
        ))}
      </code>
    </pre>
  );
}
