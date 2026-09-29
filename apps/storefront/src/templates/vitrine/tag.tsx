import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

/**
 * Étiquette de prix percée, pendue à sa ficelle : la forme du comptoir.
 * Bout biseauté à gauche, œillet, chiffres condensés. Couleur de l'étiquette = couleur d'action.
 */
export function PriceTag({
  children,
  className,
  string = true,
  size = 'md',
}: {
  children: ReactNode;
  className?: string;
  /** Ficelle qui monte de l'œillet (l'étiquette pend). */
  string?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={cn('relative inline-flex origin-[0.9rem_50%]', className)}>
      {string && (
        <span aria-hidden className="absolute -top-5 left-[0.85rem] h-6 w-px origin-bottom -rotate-12 bg-fg/50" />
      )}
      <span
        className={cn(
          'tabular inline-flex items-center bg-primary font-heading font-extrabold tracking-tight text-on-primary uppercase [clip-path:polygon(0.9rem_0,100%_0,100%_100%,0.9rem_100%,0_50%)]',
          size === 'sm' && 'h-8 pr-3 pl-6 text-base',
          size === 'md' && 'h-10 pr-4 pl-7 text-xl',
          size === 'lg' && 'h-14 pr-5 pl-9 text-3xl',
        )}
      >
        <span aria-hidden className="absolute top-1/2 left-[0.55rem] size-2 -translate-y-1/2 rounded-full bg-bg" />
        {children}
      </span>
    </span>
  );
}

/** Mention d'état écrite au marqueur sur un carton (Neuf, Reconditionné…). */
export function MarkerNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-block -rotate-2 bg-surface px-2 py-0.5 font-hand text-sm leading-tight text-accent shadow-[0_4px_10px_-6px_rgb(0_0_0/0.6)]', className)}>
      {children}
    </span>
  );
}
