import type { MediaDto } from '@marche/contracts';
import { Package } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Vignette produit ; sans image, un aplat clair marqué du pictogramme. */
export function Thumbnail({ media, alt, className }: { media: MediaDto | null; alt: string; className?: string }) {
  const src = media?.renditions['400'] ?? media?.url;
  return (
    <span className={cn('relative inline-flex size-12 shrink-0 overflow-hidden rounded-xl bg-surface-2', className)}>
      {src ? (
        <img src={src} alt={media?.alt ?? alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-ink-3" aria-hidden>
          <Package className="size-5" strokeWidth={2} />
        </span>
      )}
    </span>
  );
}
