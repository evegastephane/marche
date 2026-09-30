import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Swatch } from './swatch';

/**
 * Valeur à cocher (axe de variante, liste à plusieurs choix) : en creux au repos,
 * touche levée cerclée d'encre une fois cochée, avec la coche pour ne pas dépendre de la couleur.
 */
export function ValueChip({
  pressed,
  onToggle,
  swatch,
  children,
}: {
  pressed: boolean;
  onToggle: (pressed: boolean) => void;
  /** Pastille de couleur ; `undefined` pour une valeur sans couleur. */
  swatch?: string | null;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onToggle(!pressed)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-[560] transition-[background-color,box-shadow,color] duration-150 ease-out-soft max-md:h-10 max-md:px-3',
        pressed
          ? 'bg-key text-ink shadow-[0_0_0_1.5px_var(--color-ink),var(--shadow-key)]'
          : 'well text-ink-2 hover:text-ink',
      )}
    >
      {pressed ? (
        <Check className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      ) : (
        swatch !== undefined && <Swatch hex={swatch} className="size-3" />
      )}
      {pressed && swatch !== undefined && <Swatch hex={swatch} className="size-3" />}
      {children}
    </button>
  );
}
