import { LoaderCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { glide, press } from './motion';

/**
 * Touches de l'instrument :
 * - `primary` : la touche orange, une seule par écran, celle de l'action à faire maintenant ;
 * - `secondary` : touche blanche (noire en sombre) à arête ombrée ;
 * - `ink` : touche noire, pour l'emphase sans l'orange ;
 * - `ghost` : légende seule, pour les actions de repli ;
 * - `danger` : action destructrice confirmée ;
 * - `display` : touche posée dans la fenêtre noire de l'afficheur.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ink' | 'ghost' | 'danger' | 'display';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-key hover:bg-accent-strong active:shadow-key-pressed',
  secondary:
    'bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)] hover:bg-surface-2 active:bg-key-pressed active:shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key-pressed)]',
  ink: 'bg-ink text-canvas shadow-key hover:opacity-90 active:shadow-key-pressed',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-surface-3',
  danger: 'bg-danger text-white shadow-key hover:brightness-95 active:shadow-key-pressed',
  display:
    'text-display-ink shadow-[inset_0_0_0_1px_var(--color-display-line)] hover:bg-display-ink/8 active:bg-display-ink/12',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[0.8125rem] max-md:h-10 max-md:px-3.5',
  md: 'h-10 gap-2 rounded-[0.7rem] px-4 text-[0.9375rem] max-md:h-11',
  lg: 'h-12 gap-2.5 rounded-xl px-5 text-base',
};

const base =
  'relative isolate inline-flex shrink-0 select-none items-center justify-center font-[600] whitespace-nowrap no-underline duration-200 ease-out-soft disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.1em] [&_svg]:shrink-0';

type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver'
>;

export interface ButtonProps extends NativeProps {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  /**
   * Lumière orange partagée : la touche allumée porte la face orange `lightId`.
   * Quand une autre touche du même `lightId` s'allume, la face glisse jusqu'à elle.
   */
  lit?: boolean;
  lightId?: string;
}

/** Touche : s'enfonce d'un pixel sous le doigt ; le chargement prend la place de l'icône sans décaler la légende. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    lit = false,
    lightId,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
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

  const shared = lightId !== undefined;
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      whileTap={{ y: 1, scale: 0.985 }}
      transition={press}
      className={cn(
        base,
        'transition-[background-color,box-shadow,color,opacity,filter]',
        shared ? variants.secondary : variants[variant],
        shared && lit && 'text-on-accent shadow-none hover:bg-transparent',
        sizes[size],
        className,
      )}
      {...props}
    >
      {shared && lit && (
        <motion.span
          layoutId={lightId}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-[inherit] bg-accent shadow-key"
          transition={glide}
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {lead}
      </AnimatePresence>
      {children}
    </motion.button>
  );
});

/** Classes d'une touche pour un lien (Link du routeur, <a>). */
export function buttonClasses(variant: ButtonVariant = 'secondary', size: Size = 'md', className?: string): string {
  return cn(
    base,
    'transition-[background-color,box-shadow,color,opacity,transform] active:translate-y-px',
    variants[variant],
    sizes[size],
    className,
  );
}
