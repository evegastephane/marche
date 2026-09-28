import { cn } from '@/shared/lib/cn';

/** « Chez Aloys » → « CA » ; « awa » → « A ». */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w));
  const letters = words.length > 1 ? [words[0] ?? '', words.at(-1) ?? ''] : words.slice(0, 1);
  return letters.map((w) => Array.from(w)[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * Vignette d'identité : la photo quand il y en a une, sinon les initiales gravées dans un creux.
 * Ronde pour une personne, carrée pour une boutique.
 */
export function Avatar({
  name,
  src,
  shape = 'round',
  className,
}: {
  name: string;
  src?: string | null;
  shape?: 'round' | 'square';
  className?: string;
}) {
  const radius = shape === 'round' ? 'rounded-full' : 'rounded-[0.55rem]';
  return (
    <span
      aria-hidden
      className={cn(
        'well relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden text-[0.75rem] font-[650] tracking-[0.02em] text-ink',
        radius,
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
