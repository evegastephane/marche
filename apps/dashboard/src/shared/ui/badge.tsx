import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { snappy } from './motion';

export type BadgeTone = 'brand' | 'sun' | 'accent' | 'success' | 'danger' | 'neutral' | 'outline' | 'draft';

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  brand: { box: 'bg-brand-soft text-brand-ink', dot: 'bg-brand' },
  sun: { box: 'bg-sun-soft text-sun-ink', dot: 'bg-sun' },
  accent: { box: 'bg-accent-soft text-accent-ink', dot: 'bg-accent' },
  success: { box: 'bg-success-soft text-success-ink', dot: 'bg-success' },
  danger: { box: 'bg-danger-soft text-danger-ink', dot: 'bg-danger' },
  neutral: { box: 'bg-surface-2 text-ink-2', dot: 'bg-ink-3' },
  outline: {
    box: 'bg-transparent text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-strong)]',
    dot: 'bg-ink-3',
  },
  draft: {
    box: 'bg-transparent text-ink-2 outline-1 outline-dashed outline-offset-[-1px] outline-line-strong',
    dot: 'bg-ink-3',
  },
};

/**
 * Pastille d'état : point de couleur + libellé. Quand l'état change,
 * l'ancien libellé s'efface vers le haut et le nouveau monte à sa place.
 */
export function Badge({ tone, children, className }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <motion.span
      layout
      transition={snappy}
      className={cn(
        'relative inline-flex h-6 items-center gap-1.5 overflow-hidden rounded-full px-2.5 align-middle text-[0.75rem] font-[650] whitespace-nowrap transition-colors duration-300',
        t.box,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full transition-colors duration-300', t.dot)} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(children)}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={snappy}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** Icône dans une pastille ronde teintée : repère visuel des états vides et des étapes. */
export function IconBadge({
  icon: Icon,
  size = 'md',
  tone = 'brand',
  className,
}: {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'sun' | 'accent' | 'success' | 'neutral';
  className?: string;
}) {
  const box = {
    sm: 'size-8 rounded-[10px]',
    md: 'size-10 rounded-xl',
    lg: 'size-14 rounded-2xl',
  }[size];
  const glyph = { sm: 'size-4', md: 'size-[1.15rem]', lg: 'size-6' }[size];
  const color = {
    brand: 'bg-brand-soft text-brand-ink',
    sun: 'bg-sun-soft text-sun-ink',
    accent: 'bg-accent-soft text-accent-ink',
    success: 'bg-success-soft text-success-ink',
    neutral: 'bg-surface-2 text-ink-2',
  }[tone];
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center', box, color, className)}>
      <Icon className={glyph} strokeWidth={2.1} />
    </span>
  );
}
