import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { glide } from './motion';

/**
 * États de l'instrument, lus au témoin lumineux :
 * - `attention` : orange — il y a quelque chose à faire (`pulse` le fait respirer, un seul à la fois) ;
 * - `on` : noir plein (blanc en sombre) — allumé, fait, actif ;
 * - `off` : anneau creux — éteint, pas encore ;
 * - `draft` : anneau pointillé — brouillon ;
 * - `danger` : rouge — annulé, rupture, erreur.
 * Le témoin accompagne toujours un libellé : la couleur n'est jamais seule à parler.
 */
export type BadgeTone = 'attention' | 'on' | 'off' | 'draft' | 'danger';

/** Témoin lumineux seul. */
export function Led({ tone, className, pulse = false }: { tone: BadgeTone; className?: string; pulse?: boolean }) {
  const reduce = useReducedMotion();
  const glow = pulse && tone === 'attention' && !reduce;
  return (
    <span aria-hidden className={cn('relative inline-flex size-2 shrink-0', className)}>
      {glow && (
        <motion.span
          className="absolute inset-0 rounded-full bg-accent"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.6 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.6 }}
        />
      )}
      <span
        className={cn(
          'relative size-2 rounded-full transition-[background-color,box-shadow] duration-300',
          tone === 'attention' && 'bg-accent',
          tone === 'on' && 'bg-ink',
          tone === 'off' && 'shadow-[inset_0_0_0_1.5px_var(--color-ink-3)]',
          tone === 'draft' && 'outline-[1.5px] outline-dashed outline-offset-[-1.5px] outline-ink-3',
          tone === 'danger' && 'bg-danger',
        )}
      />
    </span>
  );
}

/**
 * Indicateur d'état : témoin + libellé, sans fond. Quand l'état change,
 * l'ancien libellé s'efface vers le haut et le nouveau monte à sa place.
 */
export function Badge({ tone, children, className }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <motion.span
      layout
      transition={glide}
      className={cn(
        'relative inline-flex h-6 items-center gap-2 overflow-hidden align-middle text-[0.8125rem] font-[560] whitespace-nowrap',
        tone === 'danger' ? 'text-danger-ink' : tone === 'attention' ? 'text-ink' : 'text-ink-2',
        className,
      )}
    >
      <Led tone={tone} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(children)}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={glide}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** Pictogramme au trait, posé dans un petit creux : repère des états vides et des étapes. */
export function IconBadge({
  icon: Icon,
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  tone?: string;
  className?: string;
}) {
  const box = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-[0.7rem]', lg: 'size-12 rounded-xl' }[size];
  const glyph = { sm: 'size-4', md: 'size-[1.15rem]', lg: 'size-5' }[size];
  return (
    <span aria-hidden className={cn('well inline-flex shrink-0 items-center justify-center text-ink', box, className)}>
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}
