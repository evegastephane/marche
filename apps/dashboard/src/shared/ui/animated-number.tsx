import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';

const plain = new Intl.NumberFormat('fr-FR');

/**
 * Nombre qui défile jusqu'à sa valeur (à l'apparition, puis à chaque changement).
 * Le premier comptage prend son temps ; les changements suivants sont des changements
 * d'état et restent sous le tiers de seconde.
 * Chiffres tabulaires : la largeur ne tremble pas pendant le comptage.
 * Les lecteurs d'écran lisent directement la valeur finale.
 */
export function AnimatedNumber({
  value,
  format = (n) => plain.format(Math.round(n)),
  className,
  duration = 0.9,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const formatRef = useRef(format);
  formatRef.current = format;
  const current = useMotionValue(reduce ? value : 0);
  const played = useRef(false);
  const text = useTransform(current, (n) => formatRef.current(n));

  useEffect(() => {
    if (reduce) {
      current.set(value);
      return;
    }
    if (!inView) return;
    const controls = animate(current, value, {
      duration: played.current ? Math.min(duration, 0.3) : duration,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => {
        played.current = true;
      },
    });
    return () => controls.stop();
  }, [value, inView, reduce, duration, current]);

  return (
    <span ref={ref} className={cn('tabular', className)}>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
