import { cn } from '@/shared/lib/cn';

export const PLATFORM_ROOT_DOMAIN =
  (import.meta.env.VITE_PLATFORM_ROOT_DOMAIN as string | undefined) ?? 'localhost:3001';

export function siteHost(slug: string): string {
  return `${slug || 'votre-boutique'}.${PLATFORM_ROOT_DOMAIN}`;
}

/** Adresse du site de la boutique, avec un témoin qui pulse quand le site est en ligne. */
export function SiteAddress({ host, live = false, className }: { host: string; live?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'tabular inline-flex max-w-full items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[0.8125rem] font-[650] text-ink shadow-[inset_0_0_0_1px_var(--color-line)]',
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2 shrink-0">
        {live && (
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
        )}
        <span className={cn('relative size-2 rounded-full', live ? 'bg-success' : 'bg-ink-3')} />
      </span>
      <span className="truncate">{host}</span>
    </span>
  );
}
