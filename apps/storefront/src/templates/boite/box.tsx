import type { MediaDto } from '@marche/contracts';
import { cn } from '@/lib/format';
import { imageProps } from '../default/components/media';

/**
 * Face avant de la boîte : la marque imprimée en haut, l'appareil au centre, son nom en capitales
 * espacées en bas. Rien d'autre, comme une vraie boîte.
 */
export function BoxFront({
  image,
  title,
  brand,
  sizes,
  priority,
  className,
}: {
  image: MediaDto | null;
  title: string;
  brand: string | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('box-face flex flex-col items-center justify-between gap-4 p-5 sm:p-7', className)}>
      <span className="self-start text-[0.6875rem] font-medium tracking-[0.32em] text-muted uppercase">{brand ?? ' '}</span>
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        {image ? (
          <img
            {...imageProps(image, sizes)}
            alt={image.alt ?? title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            className="max-h-full w-auto max-w-full object-contain drop-shadow-[0_18px_22px_rgb(0_0_0/0.18)]"
          />
        ) : (
          <span className="text-center text-2xl font-light tracking-[0.18em] uppercase">{title}</span>
        )}
      </div>
      <span className="text-center text-sm font-light tracking-[0.22em] text-balance uppercase">{title}</span>
    </div>
  );
}

/** Case de l'étiquette ; cochée, elle prend la couleur d'action (version fixe, sans tracé animé). */
export function Tick({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center border-[1.5px]',
        checked ? 'border-primary bg-primary text-on-primary' : 'border-current',
        className,
      )}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-3">
          <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** Sceau de garantie, imprimé en rond sur le carton (seulement quand le produit porte une garantie). */
export function WarrantySeal({ months, className }: { months: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-24 shrink-0 -rotate-[10deg] flex-col items-center justify-center rounded-full border-2 border-accent text-accent',
        className,
      )}
    >
      <span className="font-hand text-[0.5625rem] tracking-[0.24em] uppercase">Garantie</span>
      <span className="tabular text-3xl leading-none font-semibold">{months}</span>
      <span className="font-hand text-[0.5625rem] tracking-[0.24em] uppercase">mois</span>
    </span>
  );
}
