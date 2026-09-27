'use client';

import { AnimatePresence, motion, MotionConfig, useInView, type Variants } from 'motion/react';
import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react';

/**
 * Mouvement du template : les blocs montent légèrement en entrant dans l'écran,
 * une seule fois, et les grilles de produits arrivent carte après carte.
 *
 * Connexions lentes d'abord : le HTML arrive toujours visible. Seuls les blocs encore
 * sous la ligne de flottaison au démarrage sont masqués (hors de la vue, donc sans éclair),
 * puis révélés quand on y arrive. Sans JavaScript, tout reste affiché.
 */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 18, transition: { duration: 0 } },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** 'show' tant que le bloc n'a pas à être animé, sinon suit son entrée dans l'écran. */
function useScrollReveal(ref: RefObject<HTMLElement | null>) {
  const [armed, setArmed] = useState(false);
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  useLayoutEffect(() => {
    const top = ref.current?.getBoundingClientRect().top;
    if (top !== undefined && top > window.innerHeight) setArmed(true);
  }, [ref]);
  return armed && !inView ? 'hidden' : 'show';
}

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useScrollReveal(ref);
  return (
    <motion.div ref={ref} className={className} initial={false} animate={state} variants={rise}>
      {children}
    </motion.div>
  );
}

export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const state = useScrollReveal(ref);
  return (
    <motion.ul
      ref={ref}
      className={className}
      initial={false}
      animate={state}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li className={className} variants={rise}>
      {children}
    </motion.li>
  );
}

/** Pastille du panier : rebondit à chaque changement du nombre d'articles. */
export function CartCount({ count }: { count: number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, y: -6, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          className="tabular inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary"
        >
          {count}
          <span className="sr-only"> {count > 1 ? 'articles' : 'article'}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Coche qui se dessine : confirmation de commande. */
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 52 52"
      className={className}
      aria-hidden
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
    >
      <circle cx="26" cy="26" r="26" className="fill-primary" />
      <motion.path
        d="M15 27.5 L22.5 35 L37.5 19"
        fill="none"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-primary"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.25 }}
      />
    </motion.svg>
  );
}
