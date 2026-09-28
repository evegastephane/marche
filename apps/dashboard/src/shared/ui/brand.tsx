import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import wordmarkUrl from '@/assets/brand/upsell-wordmark.png';
import { cn } from '@/shared/lib/cn';
import { EASE_OUT, press } from './motion';

const ORANGE = '#f66b21';

/* Emblème tracé sur le logo v2 (docs/brand/upsell-logo.jpg), repère 376 × 320. */
const BODY = 'M7 80H260L244 115H65L100 200H257L318 66H369L278 234H79Z';
const ARROW = 'M316.4 70L326 49H254L294 8H369V66L366.8 70Z';
/** Ligne médiane du panier : un trait épais qui la parcourt dévoile la forme, comme tracée à la main. */
const TRACE = 'M300 97H36L90 217H268L356 36';
const WHEELS = [132, 239];

/**
 * Emblème Upsell : le chariot dont la poignée jaillit en flèche, sur deux roues orange.
 * Avec `intro`, il s'allume : le panier se trace, la flèche jaillit, puis les deux roues
 * s'allument l'une après l'autre comme les témoins d'un instrument.
 * La forme suit `currentColor` (encre en clair, blanc en sombre) ; les roues restent orange.
 */
export function UpsellMark({
  className,
  intro = false,
  delay = 0,
  title,
}: {
  className?: string;
  intro?: boolean;
  delay?: number;
  title?: string;
}) {
  const reduce = useReducedMotion();
  const maskId = `trace-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const play = intro && !reduce;

  return (
    <svg
      viewBox="0 0 376 320"
      className={cn('shrink-0 overflow-visible', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {play && (
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width="420" height="360">
          <motion.path
            d={TRACE}
            fill="none"
            stroke="#fff"
            strokeWidth={76}
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.62, ease: EASE_OUT, delay }}
          />
        </mask>
      )}
      <path d={BODY} fill="currentColor" mask={play ? `url(#${maskId})` : undefined} />
      <motion.path
        d={ARROW}
        fill="currentColor"
        style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}
        initial={play ? { opacity: 0, x: -26, y: 26, scale: 0.6 } : false}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ ...press, delay: delay + 0.42 }}
      />
      {WHEELS.map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy={287}
          r={25}
          fill={ORANGE}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={play ? { opacity: 0, scale: 0.3 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...press, delay: delay + 0.62 + i * 0.12 }}
        />
      ))}
    </svg>
  );
}

/**
 * Wordmark « Upsell » tel que dessiné sur le logo : l'image sert de masque,
 * la couleur suit `currentColor` et donc le thème.
 */
export function UpsellWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block aspect-[517/191] h-[1em] shrink-0 bg-current', className)}
      style={{
        maskImage: `url(${wordmarkUrl})`,
        WebkitMaskImage: `url(${wordmarkUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  );
}

/** Logo complet : emblème + wordmark, en ligne. La taille suit `font-size`. */
export function UpsellLogo({
  className,
  intro = false,
  delay = 0,
}: {
  className?: string;
  intro?: boolean;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <span role="img" aria-label="Upsell" className={cn('inline-flex items-center gap-[0.32em] text-ink', className)}>
      <UpsellMark intro={intro} delay={delay} className="h-[1.18em] w-auto" />
      <motion.span
        className="inline-flex"
        initial={intro && !reduce ? { opacity: 0, x: -6 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.36, ease: EASE_OUT, delay: delay + 0.3 }}
      >
        <UpsellWordmark className="h-[1.02em] translate-y-[0.14em]" />
      </motion.span>
    </span>
  );
}
