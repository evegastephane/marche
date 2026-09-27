import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { IconBadge } from './badge';
import { EASE_OUT, riseIn } from './motion';

/** Bloc de chargement à la forme du contenu attendu, traversé d'un reflet. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('shimmer block rounded-lg', className)} />;
}

/** État vide qui apprend l'écran : ce qui apparaîtra ici, et comment y arriver. */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn('flex flex-col items-start gap-4 px-6 py-10 sm:flex-row sm:items-center sm:gap-5', className)}
    >
      <motion.span
        initial={{ scale: 0.6, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 16,
          delay: 0.08,
        }}
      >
        <IconBadge icon={icon} size="lg" />
      </motion.span>
      <div className="flex max-w-[52ch] flex-1 flex-col gap-1">
        <p className="heading text-base">{title}</p>
        <div className="text-ink-2">{children}</div>
      </div>
      {action}
    </motion.div>
  );
}

/** Message d'erreur de chargement, avec l'action pour s'en sortir. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] text-danger-ink"
    >
      <span className="font-bold">Chargement impossible.</span>
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-bold underline">
          Réessayer
        </button>
      )}
    </motion.div>
  );
}

/** En-tête de page : grand titre, sous-titre, actions à droite. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      variants={riseIn}
      className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="display text-[2rem] md:text-[2.5rem]">{title}</h1>
        {subtitle && <p className="max-w-[60ch] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}
