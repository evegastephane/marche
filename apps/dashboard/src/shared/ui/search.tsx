import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';

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
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-encre-2" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 w-full rounded-lg bg-white pr-9 pl-9 text-encre shadow-[inset_0_0_0_1.5px_var(--color-filet-fort)] transition-shadow duration-150 placeholder:text-encre-3 focus-visible:shadow-[inset_0_0_0_2px_var(--color-baobab)] focus-visible:outline-none max-md:h-11 max-md:text-base [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-encre-2 hover:bg-chaux-2 hover:text-encre"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
