import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

/**
 * Chiffre peint à place fixe : chiffres tabulaires, case réservée,
 * la valeur change sur place sans décaler la mise en page.
 */
export function Chiffre({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn('lettrage chiffres relative inline-grid', className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="col-start-1 row-start-1"
          initial={reduce ? false : { opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
