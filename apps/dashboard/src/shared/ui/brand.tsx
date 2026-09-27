import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { EASE_OUT } from './motion';

const BLUE = 'var(--color-brand)';
const ORANGE = '#ff5a2b';
const YELLOW = '#fdb52a';

/**
 * Emblème Upsell dessiné en SVG : le chariot dont la poignée monte en flèche.
 * Avec `intro`, il se dessine (trait, flèche qui pousse, articles qui tombent dans le chariot,
 * roues qui se posent) : c'est le geste signature de la marque.
 */
export function UpsellMark({
  className,
  intro = false,
  delay = 0,
  title,
  mono,
}: {
  className?: string;
  intro?: boolean;
  delay?: number;
  title?: string;
  /** Une seule couleur pour tout l'emblème (filigrane). */
  mono?: string;
}) {
  const reduce = useReducedMotion();
  const blue = mono ?? BLUE;
  const orange = mono ?? ORANGE;
  const yellow = mono ?? YELLOW;
  const play = intro && !reduce;
  const at = (t: number) => delay + t;

  return (
    <svg
      viewBox="0 0 100 80"
      className={cn('overflow-visible', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <motion.path
        d="M8 20 H21 Q24.5 20 26 23.5 L36.5 47 Q39 52.5 45 52.5 H65 Q70.5 52.5 72 47 L78 20"
        fill="none"
        stroke={blue}
        strokeWidth={7.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT, delay: at(0) }}
      />
      <motion.path
        d="M78 5 L90.5 18.5 Q91.5 20.5 89 20.5 H67 Q64.5 20.5 65.5 18.5 Z"
        fill={blue}
        stroke={blue}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        initial={play ? { opacity: 0, y: 10, scale: 0.6 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 520,
          damping: 18,
          delay: at(0.55),
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
            delay: at(0.35),
          }}
        >
          <rect x={37} y={27} width={27} height={6.5} rx={3.25} fill={orange} />
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
            delay: at(0.45),
          }}
        >
          <rect x={40} y={37} width={25} height={6.5} rx={3.25} fill={yellow} />
        </motion.g>
      </g>
      {[45, 65].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy={66}
          r={6}
          fill={orange}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={play ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 600,
            damping: 16,
            delay: at(0.62 + i * 0.07),
          }}
        />
      ))}
    </svg>
  );
}

/** Logo complet : emblème + « Upsell » en marine (blanc sur fond de marque). */
export function UpsellLogo({
  className,
  intro = false,
  tone = 'ink',
}: {
  className?: string;
  intro?: boolean;
  tone?: 'ink' | 'white';
}) {
  const reduce = useReducedMotion();
  return (
    <span className={cn('inline-flex items-center gap-2', className)} aria-label="Upsell" role="img">
      <UpsellMark intro={intro} className="h-[1.35em] w-auto" />
      <motion.span
        aria-hidden
        className={cn(
          'text-[1em] leading-none font-[800] tracking-[-0.04em]',
          tone === 'white' ? 'text-white' : 'text-ink',
        )}
        initial={intro && !reduce ? { opacity: 0, x: -6 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.25 }}
      >
        Upsell
      </motion.span>
    </span>
  );
}
