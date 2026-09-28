'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

/* Même dessin que le dashboard (apps/dashboard/src/shared/ui/brand.tsx), tracé sur le logo v2. */
const BODY = 'M7 80H260L244 115H65L100 200H257L318 66H369L278 234H79Z';
const ARROW = 'M316.4 70L326 49H254L294 8H369V66L366.8 70Z';
const TRACE = 'M300 97H36L90 217H268L356 36';
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const PRESS = { type: 'spring', stiffness: 900, damping: 48, mass: 0.6 } as const;

/**
 * Emblème Upsell : le chariot dont la poignée jaillit en flèche, sur deux roues orange.
 * La forme suit `currentColor`. Avec `intro`, il s'allume : le panier se trace, la flèche jaillit,
 * les roues s'allument l'une après l'autre.
 */
export function UpsellMark({ className, intro = false }: { className?: string; intro?: boolean }) {
  const reduce = useReducedMotion();
  const maskId = `trace-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const play = intro && !reduce;
  return (
    <svg viewBox="0 0 376 320" className={className} aria-hidden style={{ overflow: 'visible' }}>
      {play && (
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width="420" height="360">
          <motion.path
            d={TRACE}
            fill="none"
            stroke="#fff"
            strokeWidth={76}
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.62, ease: EASE_OUT }}
          />
        </mask>
      )}
      <path d={BODY} fill="currentColor" mask={play ? `url(#${maskId})` : undefined} />
      <motion.path
        d={ARROW}
        fill="currentColor"
        style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}
        initial={play ? { opacity: 0, x: -26, y: 26, scale: 0.6 } : false}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ ...PRESS, delay: 0.42 }}
      />
      {[132, 239].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy={287}
          r={25}
          fill="#f66b21"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={play ? { opacity: 0, scale: 0.3 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...PRESS, delay: 0.62 + i * 0.12 }}
        />
      ))}
    </svg>
  );
}

/** Wordmark « Upsell » du logo, en masque : la couleur suit `currentColor`. */
export function UpsellWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-block',
        aspectRatio: '517 / 191',
        height: '1em',
        backgroundColor: 'currentColor',
        maskImage: 'url(/brand/upsell-wordmark.png)',
        WebkitMaskImage: 'url(/brand/upsell-wordmark.png)',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  );
}
