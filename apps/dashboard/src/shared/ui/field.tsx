import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const control =
  'w-full rounded-lg bg-white text-encre shadow-[inset_0_0_0_1.5px_var(--color-filet-fort)] transition-shadow duration-150 placeholder:text-encre-3 hover:shadow-[inset_0_0_0_1.5px_var(--color-encre-3)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-baobab)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_2px_var(--color-rouge)] disabled:bg-chaux disabled:text-encre-3';

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
      <label htmlFor={id} className="text-[0.8125rem] font-[640] text-encre">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-erreur`} className="text-[0.8125rem] font-medium text-rouge">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-aide`} className="text-[0.8125rem] text-encre-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, 'h-10 px-3 max-md:h-11 max-md:text-base', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(control, 'min-h-28 resize-y px-3 py-2.5 leading-relaxed max-md:text-base', className)}
        {...props}
      />
    );
  },
);

/** Liste déroulante native : l'affordance du système, parfaite au téléphone. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(control, 'h-10 appearance-none pr-9 pl-3 max-md:h-11 max-md:text-base', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-encre-2"
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
      <Input ref={ref} className={cn('chiffres pr-16', className)} {...props} />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.8125rem] font-semibold text-encre-2">
        {suffix}
      </span>
    </div>
  );
});
