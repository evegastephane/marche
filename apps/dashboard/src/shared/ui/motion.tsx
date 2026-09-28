import { motion, type Transition, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Grammaire de mouvement « L'instrument » : fluide et précis.
 * - `press` : ressort sec d'une touche qui s'enfonce et revient, sans rebond.
 * - `glide` : ressort de glissement des curseurs, de la lumière orange, des mises en page.
 * - entrées courtes (0,36 s) qui montent de quelques pixels, en cascade de 40 ms.
 * Rien ne dure plus de 0,4 s, hors comptage des chiffres et allumage de l'emblème.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const press: Transition = { type: 'spring', stiffness: 900, damping: 48, mass: 0.6 };
export const glide: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

/** Anciens noms, gardés pour les appels existants : ils suivent la même grammaire. */
export const spring = press;
export const snappy = glide;
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 32 };

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE_OUT } },
};

export const staggerParent = (stagger = 0.04, delay = 0): Variants => ({
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_OUT, delay }}
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
