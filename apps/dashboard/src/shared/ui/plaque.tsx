import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type PlaqueTone = 'jaune' | 'bleu' | 'vert' | 'rouge' | 'contour' | 'contour-blanc' | 'pointille';

const tones: Record<PlaqueTone, string> = {
  jaune: 'bg-jaune text-encre',
  bleu: 'bg-bleu text-white',
  vert: 'bg-baobab text-white',
  rouge: 'bg-rouge text-white',
  contour: 'bg-transparent text-encre shadow-[inset_0_0_0_1.5px_var(--color-encre-2)]',
  'contour-blanc': 'bg-transparent text-white shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.85)]',
  pointille: 'bg-transparent text-encre-2 outline-[1.5px] outline-dashed outline-offset-[-1.5px] outline-encre-3',
};

/**
 * Plaque d'état peinte. Signature du monde : quand l'état change, la nouvelle couleur
 * se repeint d'un coup de pinceau, de gauche à droite, par-dessus l'ancienne.
 */
export function Plaque({ tone, children, className }: { tone: PlaqueTone; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn('relative inline-grid overflow-hidden rounded-[5px] align-middle', className)}>
      <AnimatePresence initial={false}>
        <motion.span
          key={tone + String(children)}
          className={cn(
            'col-start-1 row-start-1 inline-flex h-6 items-center px-2 text-[0.6875rem] font-[760] tracking-[0.05em] whitespace-nowrap uppercase [font-stretch:88%]',
            tones[tone],
          )}
          style={{ zIndex: 1 }}
          initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          exit={{ zIndex: 0, transition: { duration: 0.32 } }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
