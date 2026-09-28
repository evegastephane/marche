import { cn } from '@/shared/lib/cn';

export const PLATFORM_ROOT_DOMAIN =
  (import.meta.env.VITE_PLATFORM_ROOT_DOMAIN as string | undefined) ?? 'localhost:3001';

export function siteHost(slug: string): string {
  return `${slug || 'votre-boutique'}.${PLATFORM_ROOT_DOMAIN}`;
}

/**
 * Adresse du site dans sa petite fenêtre d'afficheur, avec son témoin :
 * allumé quand le site est en ligne, creux sinon.
 */
export function SiteAddress({ host, live = false, className }: { host: string; live?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'display-window tabular inline-flex h-9 max-w-full items-center gap-2.5 rounded-[0.7rem] px-3 text-[0.8125rem] font-[500]',
        className,
      )}
    >
      <span aria-hidden className="relative inline-flex size-2 shrink-0">
        <span
          className={cn(
            'size-2 rounded-full transition-colors duration-300',
            live ? 'led-lit' : 'shadow-[inset_0_0_0_1.5px_var(--color-display-dim)]',
          )}
        />
      </span>
      <span className="truncate">{host}</span>
      <span className="sr-only">{live ? '(en ligne)' : '(hors ligne)'}</span>
    </span>
  );
}
