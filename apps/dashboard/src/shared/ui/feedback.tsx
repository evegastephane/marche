import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Pastille } from './pastille';

/** Bloc de chargement : aplat de chaux qui respire, à la forme du contenu attendu. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-md bg-chaux-2', className)} />;
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
    <div className={cn('flex flex-col items-start gap-4 px-6 py-10 sm:flex-row sm:items-center sm:gap-6', className)}>
      <Pastille icon={icon} size="lg" />
      <div className="flex max-w-[52ch] flex-1 flex-col gap-1">
        <p className="text-base font-[680] text-encre">{title}</p>
        <div className="text-encre-2">{children}</div>
      </div>
      {action}
    </div>
  );
}

/** Message d'erreur de chargement, avec l'action pour s'en sortir. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-rouge-50 px-4 py-3 text-[0.875rem] text-[#7d1f16]">
      <span className="font-semibold">Chargement impossible.</span>
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Réessayer
        </button>
      )}
    </div>
  );
}

/** En-tête de page : titre peint en capitales, actions à droite. */
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
    <header className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="lettrage text-[2.75rem] text-baobab md:text-[3.25rem]">{title}</h1>
        {subtitle && <p className="max-w-[60ch] text-encre-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Titre de planche : capitales condensées, filet sous le titre. */
export function PlancheHeader({
  title,
  count,
  actions,
  className,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <h2 className="titre flex items-baseline gap-2 text-[1.3rem] text-encre">
        {title}
        {count !== undefined && <span className="chiffres text-[1rem] text-encre-2">{count}</span>}
      </h2>
      {actions}
    </div>
  );
}
