import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

/**
 * Champ en creux : fond légèrement enfoncé au repos, face blanche et filet d'encre au focus,
 * rouge si invalide.
 */
export const controlClasses =
  'w-full rounded-[0.7rem] bg-surface-2 text-ink shadow-[var(--shadow-well),inset_0_0_0_1px_var(--color-line)] transition-[box-shadow,background-color] duration-200 ease-out-soft placeholder:text-ink-3 hover:shadow-[var(--shadow-well),inset_0_0_0_1px_var(--color-line-strong)] focus-visible:bg-surface focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-ink),0_0_0_4px_var(--color-surface-3)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger),0_0_0_4px_var(--color-danger-soft)] disabled:text-ink-3';

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}

/** Libellé, contrôle, aide et erreur, reliés pour les lecteurs d'écran. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-erreur` : hint ? `${id}-aide` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-[600] text-ink">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      <AnimatePresence mode="popLayout" initial={false}>
        {error ? (
          <motion.p
            key="erreur"
            id={`${id}-erreur`}
            className="text-[0.8125rem] font-[560] text-danger-ink"
            initial={{ opacity: 0, y: -4, x: 0 }}
            animate={{ opacity: 1, y: 0, x: [0, -3, 3, -1, 0] }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28 }}
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="aide"
            id={`${id}-aide`}
            className="text-[0.8125rem] text-ink-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input ref={ref} className={cn(controlClasses, 'h-10 px-3.5 max-md:h-11 max-md:text-base', className)} {...props} />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(controlClasses, 'min-h-28 resize-y px-3.5 py-2.5 leading-relaxed max-md:text-base', className)}
      {...props}
    />
  );
});

/** Liste déroulante native : l'affordance du système, parfaite au téléphone. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(controlClasses, 'h-10 appearance-none pr-9 pl-3.5 max-md:h-11 max-md:text-base', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2"
        strokeWidth={1.8}
        aria-hidden
      />
    </div>
  );
});

/** Champ avec un suffixe fixe (devise, unité). */
export const InputWithSuffix = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { suffix: ReactNode }
>(function InputWithSuffix({ suffix, className, ...props }, ref) {
  return (
    <div className="relative">
      <Input ref={ref} className={cn('tabular pr-16', className)} {...props} />
      <span className="legend pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">{suffix}</span>
    </div>
  );
});
