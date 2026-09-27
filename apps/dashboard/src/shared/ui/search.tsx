import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { controlClasses } from './field';
import { snappy } from './motion';

/** Recherche avec un léger délai : la liste se filtre pendant la frappe sans saturer l'API. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), 300);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className={cn(
          controlClasses,
          'h-10 rounded-full pr-10 pl-10 max-md:h-11 max-md:text-base [&::-webkit-search-cancel-button]:hidden',
        )}
      />
      <AnimatePresence>
        {draft && (
          <motion.button
            type="button"
            onClick={() => {
              setDraft('');
              onChange('');
            }}
            aria-label="Effacer la recherche"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={snappy}
            className="absolute top-2 right-2 rounded-full p-1 text-ink-2 hover:bg-surface-2 hover:text-ink max-md:top-2.5"
          >
            <X className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
