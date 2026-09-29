import { Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

/** Lettres des vues d'un modèle (A, B, C…), comme sur l'enveloppe d'un patron. */
export const VIEW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Tracé de coupe : un cadre en pointillés, les ciseaux posés sur le trait. Tout ce qui est « à découper »
 * (photo du modèle, coupon de commande) passe par lui.
 */
export function CutFrame({ children, className, scissors = true }: { children: ReactNode; className?: string; scissors?: boolean }) {
  return (
    <div className={cn('relative border-[1.5px] border-dashed border-fg/75 p-2', className)}>
      {scissors && (
        <Scissors aria-hidden strokeWidth={1.8} className="absolute -top-[0.7rem] left-5 z-10 size-5 bg-bg px-0.5 text-fg" />
      )}
      {children}
    </div>
  );
}

/** Flèche de droit-fil : la ligne que le tailleur aligne sur le fil du tissu. */
export function Grainline({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none flex flex-col items-center gap-1.5 text-fg', className)}>
      <svg viewBox="0 0 12 160" className="h-full w-3 overflow-visible" preserveAspectRatio="none">
        <path d="M6 2 L6 158 M1 10 L6 2 L11 10 M1 150 L6 158 L11 150" fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/** Crans de repère sur un bord de pièce (deux triangles, comme sur le papier du patron). */
export function Notches({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 22 8" className={cn('h-2 w-[1.4rem] text-fg', className)}>
      <path d="M0 0 L4 8 L8 0 Z M14 0 L18 8 L22 0 Z" fill="currentColor" />
    </svg>
  );
}

/** Lettre d'une vue, cerclée ; au rouge de tracé quand c'est la vue choisie. */
export function ViewLetter({ letter, active, className }: { letter: string; active?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] font-heading text-sm font-black [font-stretch:110%]',
        active ? 'border-primary bg-primary text-on-primary' : 'border-fg text-fg',
        className,
      )}
    >
      {letter}
    </span>
  );
}
