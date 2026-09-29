'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/format';

/**
 * Trait de stylo bille : une ellipse tracée à la main autour de ce qu'on a choisi.
 * Elle se dessine d'un geste (0,45 s), légèrement ouverte comme un vrai cercle au stylo.
 */
export function InkCircle({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      aria-hidden
      className={cn('pointer-events-none absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+0.75rem)] w-[calc(100%+1rem)] overflow-visible text-accent', className)}
    >
      <motion.path
        d="M 58 5 C 30 2, 5 12, 6 31 C 7 51, 40 58, 66 54 C 90 50, 97 34, 92 19 C 88 8, 70 3, 44 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.3, 0.6, 0.3, 1], delay }}
      />
    </svg>
  );
}

/** Trait qui barre une valeur épuisée, comme on raye au stylo. */
export function InkStrike({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden className={cn('pointer-events-none absolute inset-x-0 top-1/2 h-3 w-full -translate-y-1/2 text-accent/80', className)}>
      <path d="M 4 14 C 30 8, 62 12, 96 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Tampon de l'atelier : un cartouche à l'encre rouge, posé d'un coup sec. */
export function Stamp({ children, className }: { children: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? false : { scale: 1.5, opacity: 0, rotate: -14 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: 'spring', stiffness: 700, damping: 22 }}
      className={cn(
        'inline-flex items-center rounded-sm border-2 border-primary px-2 py-0.5 font-heading text-sm font-extrabold tracking-[0.12em] text-primary uppercase [font-stretch:80%]',
        className,
      )}
    >
      {children}
    </motion.span>
  );
}
