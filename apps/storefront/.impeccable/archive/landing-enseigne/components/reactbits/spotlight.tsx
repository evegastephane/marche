'use client';

/*
 * Adapté de « SpotlightCard » de React Bits (https://reactbits.dev), © 2026 David Haz,
 * licence MIT + Commons Clause (voir ./LICENSE.md).
 * Ici : une lampe de poche dans la réserve. La position suit le pointeur par variables CSS (aucun rendu React
 * par mouvement), et la lumière est chaude, comme celle de la boutique.
 */

import type { HTMLAttributes, PointerEvent, ReactNode } from 'react';

/** Pose la lumière sous le pointeur (souris seulement) ; à brancher sur `onPointerMove` d'un élément `ul-spotlight`. */
export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    '--ul-spot-x',
    `${event.clientX - rect.left}px`,
  );
  event.currentTarget.style.setProperty(
    '--ul-spot-y',
    `${event.clientY - rect.top}px`,
  );
}

export function Spotlight({
  as: Element = 'div',
  children,
  className = '',
  ...props
}: {
  as?: 'div' | 'article' | 'figure';
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Element
      {...props}
      className={`ul-spotlight ${className}`}
      onPointerMove={trackSpotlight}
    >
      {children}
    </Element>
  );
}
