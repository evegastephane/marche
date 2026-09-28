import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { AnimatedNumber } from './animated-number';
import { Led } from './badge';
import { glide } from './motion';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Témoin orange : ce filtre contient quelque chose à faire. */
  attention?: boolean;
}

/**
 * Sélecteur à glissière : un rail en creux, un curseur (face de touche) qui glisse
 * d'une position à l'autre. Défilement horizontal au téléphone.
 * Ce sont des boutons bascule (aria-pressed) : ils filtrent une liste, sans panneaux d'onglets.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'well flex max-w-full gap-0.5 overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[0.8125rem] font-[580] transition-colors duration-200 max-md:h-10',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`selector-${group}`}
                className="absolute inset-0 rounded-lg bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                transition={glide}
              />
            )}
            {item.attention && <Led tone="attention" className="relative" />}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span className="tabular relative text-[0.75rem] font-[500] text-ink-3">
                <AnimatedNumber value={item.count} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
