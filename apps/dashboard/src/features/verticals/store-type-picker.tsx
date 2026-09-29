import { STORE_TYPE_LABELS, STORE_TYPES, type StoreType } from '@marche/contracts';
import { type LucideIcon, Shirt, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { type KeyboardEvent, useId, useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { glide } from '@/shared/ui/motion';

export const STORE_TYPE_ICONS: Record<StoreType, LucideIcon> = {
  FASHION: Shirt,
  ELECTRONICS: Smartphone,
};

/**
 * Type de boutique : deux grandes positions dans un rail en creux, le curseur (face de touche)
 * glisse vers celle qu'on choisit. Boutons radio : flèches pour changer, Tab pour sortir.
 */
export function StoreTypePicker({
  value,
  onChange,
  label,
  className,
}: {
  value: StoreType;
  onChange: (type: StoreType) => void;
  label: string;
  className?: string;
}) {
  const group = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + STORE_TYPES.length) % STORE_TYPES.length;
    onChange(STORE_TYPES[next]!);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn('well grid gap-1 rounded-xl p-1 sm:grid-cols-2', className)}>
      {STORE_TYPES.map((type, index) => {
        const active = type === value;
        const Icon = STORE_TYPE_ICONS[type];
        return (
          <button
            key={type}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(type)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative flex min-h-[4.5rem] items-start gap-3 rounded-lg px-4 py-3.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`store-type-${group}`}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                transition={glide}
              />
            )}
            <Icon className="relative mt-0.5 size-5 shrink-0" strokeWidth={1.8} aria-hidden />
            <span className="relative flex flex-col gap-0.5">
              <span className="font-[650]">{STORE_TYPE_LABELS[type].label}</span>
              <span className="text-[0.8125rem] leading-snug text-ink-2">{STORE_TYPE_LABELS[type].description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
