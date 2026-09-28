import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { glide } from './motion';

const plain = new Intl.NumberFormat('fr-FR');
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Nombre de l'afficheur : chaque chiffre est une colonne fixe qui roule jusqu'à sa valeur,
 * comme un compteur mécanique. À l'apparition, les colonnes roulent depuis 0 (les hautes
 * un peu plus longtemps) ; ensuite, un changement de valeur fait rouler les seules colonnes touchées.
 * Les séparateurs (espaces, virgule) restent fixes. Les lecteurs d'écran lisent la valeur finale.
 */
export function AnimatedNumber({
  value,
  format = (n) => plain.format(Math.round(n)),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  /** Conservé pour compatibilité : le roulement a sa propre durée. */
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const text = format(value);
  const chars = Array.from(text);

  return (
    <span ref={ref} className={cn('tabular inline-flex', className)}>
      <span aria-hidden className="inline-flex h-[1.12em] overflow-hidden leading-[1.12em]">
        {chars.map((char, index) => {
          // Clé depuis la droite : les unités restent la même colonne quand le nombre s'allonge.
          const key = chars.length - index;
          const digit = DIGITS.indexOf(char);
          if (digit < 0) {
            return (
              <span key={`s${key}`} className="inline-block whitespace-pre">
                {char}
              </span>
            );
          }
          return (
            <span key={`d${key}`} className="relative inline-block h-[1.12em]">
              <motion.span
                className="flex flex-col"
                initial={reduce ? false : { y: '0%' }}
                animate={{ y: inView || reduce ? `${-digit * 10}%` : '0%' }}
                transition={
                  reduce ? { duration: 0 } : { ...glide, delay: Math.min(key, 8) * 0.035 }
                }
              >
                {DIGITS.map((d) => (
                  <span key={d} className="block h-[1.12em]">
                    {d}
                  </span>
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

