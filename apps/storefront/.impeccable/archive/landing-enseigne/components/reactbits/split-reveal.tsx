'use client';

/*
 * Adapté de « SplitText » de React Bits (https://reactbits.dev), © 2026 David Haz,
 * licence MIT + Commons Clause (voir ./LICENSE.md).
 * Ici : le titre est coupé en lignes masquées ; chaque ligne monte de derrière son masque, comme une enseigne
 * qu'on hisse. Sans JavaScript ou avec le mouvement réduit, le titre reste tel quel.
 */

import { type HTMLAttributes, type ReactNode, useRef } from 'react';
import { gsap, MOTION_OK, SplitText, useGSAP } from '../gsap';

type Tag = 'h1' | 'h2' | 'h3' | 'p';

export function SplitReveal({
  as: Element = 'h2',
  id,
  className,
  children,
  play = 'scroll',
  delay = 0,
  ...rest
}: HTMLAttributes<HTMLHeadingElement> & {
  as?: Tag;
  id?: string;
  className?: string;
  children: ReactNode;
  /** « scroll » : à l'arrivée à l'écran ; « load » : dès l'affichage (accroche). */
  play?: 'scroll' | 'load';
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;
      const media = gsap.matchMedia();
      media.add(MOTION_OK, () => {
        const split = SplitText.create(element, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'ul-split-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 118,
              rotate: 2.5,
              transformOrigin: '0% 100%',
              duration: 1.15,
              ease: 'expo.out',
              stagger: 0.09,
              delay,
              scrollTrigger:
                play === 'scroll'
                  ? { trigger: element, start: 'top 86%', once: true }
                  : undefined,
            }),
        });
        return () => split.revert();
      });
      return () => media.revert();
    },
    { scope: ref },
  );

  return (
    <Element {...rest} ref={ref} id={id} className={className}>
      {children}
    </Element>
  );
}
