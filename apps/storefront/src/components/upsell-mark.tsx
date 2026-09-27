'use client';

import { motion, useReducedMotion } from 'motion/react';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Emblème Upsell (même dessin que le dashboard, apps/dashboard/src/shared/ui/brand.tsx) :
 * le chariot dont la poignée monte en flèche. Avec `intro`, il se dessine à l'arrivée.
 */
export function UpsellMark({ className, intro = false }: { className?: string; intro?: boolean }) {
  const reduce = useReducedMotion();
  const play = intro && !reduce;
  return (
    <svg viewBox="0 0 100 80" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <motion.path
        d="M8 20 H21 Q24.5 20 26 23.5 L36.5 47 Q39 52.5 45 52.5 H65 Q70.5 52.5 72 47 L78 20"
        fill="none"
        stroke="#0b57f0"
        strokeWidth={7.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      />
      <motion.path
        d="M78 5 L90.5 18.5 Q91.5 20.5 89 20.5 H67 Q64.5 20.5 65.5 18.5 Z"
        fill="#0b57f0"
        stroke="#0b57f0"
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        initial={play ? { opacity: 0, y: 10, scale: 0.6 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 520,
          damping: 18,
          delay: 0.55,
        }}
      />
      <g transform="rotate(-16 50 30)">
        <motion.g
          initial={play ? { opacity: 0, y: -22 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 20,
            delay: 0.35,
          }}
        >
          <rect x={37} y={27} width={27} height={6.5} rx={3.25} fill="#ff5a2b" />
        </motion.g>
      </g>
      <g transform="rotate(-16 52 40)">
        <motion.g
          initial={play ? { opacity: 0, y: -22 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 20,
            delay: 0.45,
          }}
        >
          <rect x={40} y={37} width={25} height={6.5} rx={3.25} fill="#fdb52a" />
        </motion.g>
      </g>
      {[45, 65].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy={66}
          r={6}
          fill="#ff5a2b"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={play ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 600,
            damping: 16,
            delay: 0.62 + i * 0.07,
          }}
        />
      ))}
    </svg>
  );
}
