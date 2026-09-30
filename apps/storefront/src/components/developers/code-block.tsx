'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Touche « Copier » : « Copié » un instant, coche comprise ; échec dit comment faire à la main. */
export function CopyKey({ text, label = 'Copier', className = '' }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <button
      type="button"
      className={`up-key ${className}`}
      data-variant="ghost"
      data-size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => setState('copied'),
          () => setState('failed'),
        );
      }}
    >
      {state === 'copied' ? <Check strokeWidth={2} aria-hidden /> : <Copy strokeWidth={1.8} aria-hidden />}
      <span aria-live="polite">{state === 'copied' ? 'Copié' : state === 'failed' ? 'Sélectionnez et copiez' : label}</span>
    </button>
  );
}

/** Code à recopier : un creux, une légende, défilement horizontal plutôt que retour à la ligne. */
export function CodeBlock({ code, label, className = '' }: { code: string; label: string; className?: string }) {
  return (
    <figure className={`up-well flex min-w-0 flex-col overflow-hidden rounded-xl ${className}`}>
      <figcaption className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--up-line)] pr-2 pl-4">
        <span className="up-legend">{label}</span>
        <CopyKey text={code} />
      </figcaption>
      <pre className="up-code overflow-x-auto px-4 py-3.5 text-[0.8125rem] leading-[1.7]">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
