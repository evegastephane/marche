'use client';

import { type ElementType, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/format';

/**
 * Titre de magazine : le nom de la boutique prend toute la largeur de la une, qu'il fasse
 * quatre lettres ou vingt. Le serveur l'estime en largeur de conteneur (cqi), le navigateur
 * l'ajuste ensuite au pixel près, puis à chaque changement de largeur.
 */
export function Masthead({ name, as: Tag = 'p', className }: { name: string; as?: ElementType; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const b = box.current;
      const t = text.current;
      if (!b || !t) return;
      t.style.fontSize = '100px';
      const width = t.getBoundingClientRect().width;
      if (width > 0) t.style.fontSize = `${Math.min(340, (100 * b.clientWidth) / width) * 0.995}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (box.current) observer.observe(box.current);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [name]);

  // Estimation avant mesure : Big Shoulders noir en capitales fait environ 0,5 em par lettre.
  const estimate = `min(340px, calc(100cqi / ${Math.max(name.length, 3) * 0.5}))`;
  return (
    <div ref={box} className="w-full [container-type:inline-size]">
      <Tag className={cn('m-0 leading-none', className)}>
        <span
          ref={text}
          className="inline-block font-heading leading-[0.8] font-black whitespace-nowrap uppercase [font-variation-settings:'opsz'_72] tracking-[-0.02em]"
          style={{ fontSize: estimate }}
        >
          {name}
        </span>
      </Tag>
    </div>
  );
}
