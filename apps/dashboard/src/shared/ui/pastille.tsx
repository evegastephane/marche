import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Pastille d'icône, grammaire de l'emblème : trait blanc arrondi dans un disque vert
 * cerclé d'un anneau blanc intérieur.
 */
export function Pastille({
  icon: Icon,
  size = 'md',
  tone = 'vert',
  className,
}: {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'vert' | 'jaune' | 'creux';
  className?: string;
}) {
  const box = { sm: 'size-8', md: 'size-10', lg: 'size-14' }[size];
  const glyph = { sm: 'size-4', md: 'size-[1.15rem]', lg: 'size-6' }[size];
  const ring = { sm: 'inset-[2.5px]', md: 'inset-[3px]', lg: 'inset-[4px]' }[size];
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        tone === 'vert' && 'bg-baobab text-white',
        tone === 'jaune' && 'bg-jaune text-encre',
        tone === 'creux' && 'bg-white/10 text-white',
        box,
        className,
      )}
    >
      <span
        className={cn(
          'absolute rounded-full border-[1.5px]',
          tone === 'jaune' ? 'border-encre/70' : 'border-white/85',
          ring,
        )}
      />
      <Icon className={glyph} strokeWidth={2.1} />
    </span>
  );
}
