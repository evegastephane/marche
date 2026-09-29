'use client';

import { Pause, Play } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { cn } from '@/lib/format';

/**
 * Le bandeau LED de la devanture : le nom de la boutique, ses rayons et ses services défilent.
 * Il s'arrête au survol, au focus et au bouton ; en mouvement réduit il reste immobile.
 * Les lecteurs d'écran lisent la liste une fois, sans la répétition visuelle.
 */
export function LedMarquee({ items, className }: { items: string[]; className?: string }) {
  const [paused, setPaused] = useState(false);
  const line = items.join('  ·  ');
  // Une copie doit dépasser la largeur d'un grand écran pour que la boucle ne montre jamais de vide.
  const copy = Array.from({ length: Math.max(1, Math.ceil(90 / Math.max(line.length, 1))) }, () => line).join('  ·  ');
  const style = { '--marquee-duration': `${Math.max(24, Math.round(copy.length * 0.32))}s` } as CSSProperties;

  return (
    <div className={cn('marquee led-board relative flex h-14 items-center overflow-hidden border-b border-line sm:h-16', className)} data-paused={paused}>
      <p className="sr-only">{items.join(', ')}</p>
      <div aria-hidden className="marquee-track" style={style}>
        {[0, 1].map((k) => (
          <span key={k} className="led-text led-glow shrink-0 pr-[1.1em] text-[1.75rem] leading-none font-extrabold whitespace-pre uppercase sm:text-[2.125rem]">
            {copy}
            {'  ·'}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? 'Relancer le bandeau' : 'Arrêter le bandeau'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center border-l border-line bg-bg text-muted hover:text-fg motion-reduce:hidden"
      >
        {paused ? <Play className="size-4" strokeWidth={2.2} /> : <Pause className="size-4" strokeWidth={2.2} />}
      </button>
    </div>
  );
}
