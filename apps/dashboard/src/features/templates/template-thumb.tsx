import type { StoreType, TemplateDefinition } from '@marche/contracts';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { TemplateSketch } from '../site/template-sketch';

/**
 * Capture d'un modèle : sa page d'accueil photographiée sur une boutique du même type
 * (`/template-thumbs/{modèle}-{type}.webp`, livrée avec le modèle). Sans capture pour ce type,
 * celle d'un autre type ; sans capture du tout, le croquis dessiné du modèle.
 */
export function TemplateThumb({
  template,
  storeType,
  storeName,
  className,
  eager = false,
}: {
  template: TemplateDefinition;
  storeType: StoreType;
  storeName: string;
  className?: string;
  eager?: boolean;
}) {
  const { id, storeTypes, palettes } = template.manifest;
  const sources = [storeType, ...storeTypes.filter((t) => t !== storeType)].map((t) => `/template-thumbs/${id}-${t}.webp`);
  const [attempt, setAttempt] = useState(0);
  const src = sources[attempt];
  return (
    <span className={cn('relative block aspect-[16/10] overflow-hidden bg-surface-2', className)}>
      {src ? (
        <img
          src={src}
          alt=""
          width={1280}
          height={800}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setAttempt((n) => n + 1)}
          className="size-full object-cover object-top"
        />
      ) : (
        <TemplateSketch
          templateId={id}
          colors={palettes[0]!.colors}
          content={{ storeName }}
          size="thumb"
          className="size-full"
        />
      )}
    </span>
  );
}
