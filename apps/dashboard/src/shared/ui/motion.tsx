import { motion, type Transition, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Langage de mouvement Upsell : tout monte légèrement en arrivant (comme la flèche du logo),
 * se pose sur un ressort amorti, et rien ne dure plus d'un tiers de seconde.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const spring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};
export const softSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
};
export const snappy: Transition = {
  type: 'spring',
  bounce: 0.18,
  duration: 0.38,
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

export const staggerParent = (stagger = 0.055, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Bloc qui monte en fondu à son arrivée ; `delay` pour décaler une séquence à la main. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'header' | 'li' | 'aside';
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE_OUT, delay }}
    >
      {children}
    </Component>
  );
}

/** Conteneur dont les enfants `StaggerItem` arrivent l'un après l'autre. */
export function Stagger({
  children,
  className,
  stagger,
  delay,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: 'div' | 'ul' | 'ol' | 'section';
}) {
  const Component = motion[as];
  return (
    <Component className={className} variants={staggerParent(stagger, delay)} initial="hidden" animate="show">
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'aside';
}) {
  const Component = motion[as];
  return (
    <Component className={className} variants={riseIn}>
      {children}
    </Component>
  );
}
