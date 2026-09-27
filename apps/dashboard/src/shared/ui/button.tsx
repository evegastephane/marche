import { LoaderCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { spring } from './motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_16px_-8px_var(--color-brand)] hover:bg-brand-strong',
  secondary: 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95',
  accent: 'bg-sun text-[#0c1a3c] hover:brightness-95',
  inverse: 'bg-white text-[#0c1a3c] hover:bg-white/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-full px-3.5 text-[0.8125rem]',
  md: 'h-10 gap-2 rounded-full px-4.5 text-[0.9375rem] max-md:h-11',
  lg: 'h-12 gap-2.5 rounded-full px-6 text-base',
};

const base =
  'inline-flex shrink-0 select-none items-center justify-center font-[650] whitespace-nowrap no-underline duration-200 ease-out-soft disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.1em] [&_svg]:shrink-0';

type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver'
>;

export interface ButtonProps extends NativeProps {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/** Bouton : s'enfonce sous le doigt, l'icône laisse place au chargement sans décaler le texte. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  const lead = loading ? (
    <motion.span
      key="loading"
      className="inline-flex"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
    >
      <LoaderCircle className="animate-spin" aria-hidden />
    </motion.span>
  ) : icon ? (
    <motion.span
      key="icon"
      className="inline-flex"
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
    >
      {icon}
    </motion.span>
  ) : null;

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      whileTap={{ scale: 0.96 }}
      whileHover={variant === 'primary' || variant === 'accent' ? { y: -1 } : undefined}
      transition={spring}
      className={cn(
        base,
        'transition-[background-color,box-shadow,color,filter]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {lead}
      </AnimatePresence>
      {children}
    </motion.button>
  );
});

/** Classes d'un bouton pour un lien (Link du routeur, <a>). */
export function buttonClasses(variant: ButtonVariant = 'primary', size: Size = 'md', className?: string): string {
  return cn(
    base,
    'transition-[background-color,box-shadow,color,filter,transform] hover:-translate-y-px active:translate-y-0 active:scale-[0.97]',
    variants[variant],
    sizes[size],
    className,
  );
}
