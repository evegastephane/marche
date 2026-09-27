import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

/**
 * Nom qui s'écrit en direct : chaque lettre ajoutée monte à sa place sur un ressort.
 * C'est l'interaction signature de la création de boutique.
 */
export function LiveName({ name, placeholder, className }: { name: string; placeholder: string; className?: string }) {
  const reduce = useReducedMotion();
  const text = name.trim();
  if (!text) {
    return <span className={cn('display opacity-35', className)}>{placeholder}</span>;
  }
  return (
    <span className={cn('display block break-words', className)} aria-label={text}>
      {Array.from(text).map((char, index) => (
        <motion.span
          // La clé suit la position : seules les lettres nouvelles ou changées bougent.
          key={`${index}-${char}`}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={reduce ? false : { y: '0.5em', opacity: 0, rotate: 6 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
