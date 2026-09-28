import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { press } from './motion';

/**
 * Nom qui s'écrit en direct sur l'afficheur : chaque lettre ajoutée tombe à sa place
 * d'un cran, comme une case qui s'allume.
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
          initial={reduce ? false : { y: '-0.35em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={press}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
