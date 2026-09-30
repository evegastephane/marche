/** Pastille d'une couleur ; sans teinte connue, un anneau vide. */
export function Swatch({ hex, className }: { hex: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18)] ${className ?? ''}`}
      style={hex ? { backgroundColor: hex } : { boxShadow: 'inset 0 0 0 1.5px var(--color-ink-3)' }}
    />
  );
}
