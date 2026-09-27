import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

export interface Onglet<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Filtres en onglets peints : l'onglet actif est une plaque verte qui glisse
 * d'un onglet à l'autre. Défilement horizontal au téléphone.
 */
export function Onglets<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: Onglet<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        '-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3.5 text-[0.875rem] font-[640] transition-colors duration-150',
              active ? 'text-white' : 'text-encre-2 hover:bg-chaux-2 hover:text-encre',
            )}
          >
            {active && (
              <motion.span
                layoutId={`onglet-${group}`}
                className="absolute inset-0 rounded-md bg-baobab"
                transition={{ type: 'spring', bounce: 0.12, duration: 0.32 }}
              />
            )}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'chiffres relative rounded-[4px] px-1.5 text-[0.75rem] leading-5 font-bold',
                  active ? 'bg-white/18 text-white' : 'bg-chaux-2 text-encre-2',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
