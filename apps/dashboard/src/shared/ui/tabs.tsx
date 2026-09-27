import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { AnimatedNumber } from './animated-number';
import { snappy } from './motion';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Filtres en onglets : la pastille blanche glisse d'un onglet à l'autre
 * sur un rail gris. Défilement horizontal au téléphone.
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
      role="tablist"
      aria-label={label}
      className={cn(
        'flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-surface-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
              'relative inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-[640] transition-colors duration-200',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${group}`}
                className="absolute inset-0 rounded-full bg-surface shadow-lift"
                transition={snappy}
              />
            )}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'relative rounded-full px-1.5 text-[0.6875rem] leading-[1.125rem] font-bold',
                  active ? 'bg-brand text-on-brand' : 'bg-surface-3 text-ink-2',
                )}
              >
                <AnimatedNumber value={item.count} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
