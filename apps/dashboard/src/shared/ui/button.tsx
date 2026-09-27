import { LoaderCircle } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Variant = 'primaire' | 'secondaire' | 'fantome' | 'danger' | 'jaune' | 'blanc';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primaire: 'bg-baobab text-white hover:bg-baobab-900 active:bg-baobab-900',
  secondaire:
    'bg-planche text-baobab shadow-[inset_0_0_0_1.5px_var(--color-baobab)] hover:bg-baobab-50 active:bg-baobab-100',
  fantome: 'text-encre-2 hover:bg-chaux-2 hover:text-encre active:bg-filet',
  danger: 'bg-rouge text-white hover:bg-[#a92c21] active:bg-[#a92c21]',
  jaune: 'bg-jaune text-encre hover:bg-[#e3a40c] active:bg-[#d69a0a]',
  blanc: 'bg-white text-baobab hover:bg-baobab-50 active:bg-baobab-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-3 text-[0.8125rem]',
  md: 'h-10 gap-2 rounded-lg px-4 text-[0.9375rem] max-md:h-11',
  lg: 'h-12 gap-2.5 rounded-lg px-5 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primaire', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-[650] whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-150 ease-(--ease-pinceau) active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/** Classes d'un bouton pour un lien (Link du routeur, <a>). */
export function buttonClasses(variant: Variant = 'primaire', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center font-[650] whitespace-nowrap no-underline transition-[background-color,box-shadow,color] duration-150 ease-(--ease-pinceau) [&_svg]:size-[1.1em] [&_svg]:shrink-0',
    variants[variant],
    sizes[size],
    className,
  );
}
