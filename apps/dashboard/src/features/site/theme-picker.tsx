import type { Palette } from '@marche/contracts';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { type CSSProperties, type KeyboardEvent, useId, useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { glide } from '@/shared/ui/motion';

/** Flèches pour parcourir un groupe de boutons radio (le choix suit le focus, comme un vrai groupe radio). */
function useRovingRadios<T>(
  items: readonly T[],
  value: T,
  onChange: (item: T) => void,
) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = items.indexOf(value);
    const next = (index + step + items.length) % items.length;
    onChange(items[next]!);
    refs.current[next]?.focus();
  };
  const bind = (index: number) => ({
    ref: (node: HTMLButtonElement | null) => {
      refs.current[index] = node;
    },
    onKeyDown,
  });
  return bind;
}

/**
 * Palettes préréglées du modèle, en une seule rangée de touches (toutes visibles, sans case vide) :
 * chaque touche empile le fond et son texte, le panneau, l'action et l'accent. Au téléphone, la rangée défile.
 */
export function PalettePicker({
  palettes,
  value,
  onChange,
  columns,
}: {
  palettes: readonly Palette[];
  value: string;
  onChange: (paletteId: string) => void;
  /** Touches par rangée dès 640 px (par défaut : toutes sur une rangée). */
  columns?: number;
}) {
  const group = useId();
  const ids = palettes.map((p) => p.id);
  const current = ids.includes(value) ? value : ids[0]!;
  const bind = useRovingRadios(ids, current, onChange);
  return (
    <div
      role="radiogroup"
      aria-label="Palette de couleurs"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:[grid-template-columns:repeat(var(--keys),minmax(0,1fr))]"
      style={{ '--keys': columns ?? palettes.length } as CSSProperties}
    >
      {palettes.map((palette, index) => {
        const active = palette.id === current;
        const { background, surface, foreground, primary, accent } =
          palette.colors;
        return (
          <button
            key={palette.id}
            {...bind(index)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(palette.id)}
            className={cn(
              'relative flex w-[4.75rem] shrink-0 flex-col gap-2 rounded-lg p-1.5 pb-2 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`palette-${group}`}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                transition={glide}
              />
            )}
            <span
              aria-hidden
              className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-md ring-1 ring-line"
            >
              <span
                className="flex flex-[3] items-end p-1.5"
                style={{ background }}
              >
                <span
                  className="h-1.5 w-3/4 rounded-full"
                  style={{ background: foreground }}
                />
              </span>
              <span className="flex-[1.2]" style={{ background: surface }} />
              <span className="flex-[1.4]" style={{ background: primary }} />
              <span className="flex-1" style={{ background: accent }} />
              {active && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong)]">
                  <Check className="size-3" strokeWidth={2.8} />
                </span>
              )}
            </span>
            <span className="relative line-clamp-2 px-0.5 text-[0.75rem] leading-tight font-[600] hyphens-auto [overflow-wrap:anywhere]">
              {palette.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
