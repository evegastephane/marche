import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type KeyboardEvent, type ReactNode, useState } from 'react';
import { glide } from '@/shared/ui/motion';

/**
 * Liste de valeurs saisies une à une : chaque valeur devient une étiquette à l'encre,
 * Entrée ou virgule pour ajouter, retour arrière pour retirer la dernière.
 * Des suggestions (préréglages) s'ajoutent d'un geste sous le champ.
 */
export function TagInput({
  id,
  values,
  onChange,
  placeholder,
  suggestions = [],
  renderTag,
  renderSuggestion,
  describedBy,
  invalid,
  maxLength = 40,
}: {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Valeurs proposées ; celles déjà présentes sont masquées. */
  suggestions?: string[];
  /** Décor avant le libellé d'une étiquette (pastille de couleur…). */
  renderTag?: (value: string) => ReactNode;
  /** Décor d'une suggestion (sans élément interactif : elle est déjà un bouton). */
  renderSuggestion?: (value: string) => ReactNode;
  describedBy?: string;
  invalid?: boolean;
  maxLength?: number;
}) {
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const next = raw
      .split(',')
      .map((v) => v.trim().slice(0, maxLength))
      .filter((v, i, all) => v && !values.includes(v) && all.indexOf(v) === i);
    if (next.length > 0) onChange([...values, ...next]);
    setInput('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(input);
    } else if (event.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };
  const remaining = suggestions.filter((s) => !values.includes(s));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[0.7rem] bg-surface-2 px-2 py-1.5 shadow-[var(--shadow-well),inset_0_0_0_1px_var(--color-line)] transition-[box-shadow,background-color] duration-200 focus-within:bg-surface focus-within:shadow-[inset_0_0_0_1.5px_var(--color-ink),0_0_0_4px_var(--color-surface-3)] max-md:min-h-11">
        <AnimatePresence initial={false}>
          {values.map((value) => (
            <motion.span
              key={value}
              layout
              initial={{ opacity: 0, scale: 0.6, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={glide}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ink pr-1 pl-2 text-[0.8125rem] font-[560] text-canvas"
            >
              {renderTag?.(value)}
              {value}
              <button
                type="button"
                aria-label={`Retirer ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="-my-1 inline-flex size-7 items-center justify-center rounded-md opacity-70 hover:bg-canvas/15 hover:opacity-100"
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          value={input}
          placeholder={values.length === 0 ? placeholder : ''}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(input)}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-ink outline-none placeholder:text-ink-3 max-md:text-base"
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.8125rem] font-[560] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:bg-surface-2 hover:text-ink max-md:h-9"
            >
              <Plus className="size-3" strokeWidth={2.2} aria-hidden />
              {renderSuggestion?.(suggestion)}
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
