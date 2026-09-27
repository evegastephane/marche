import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

/**
 * Nom peint sur l'enseigne. Chaque lettre ajoutée se peint d'un coup de pinceau :
 * c'est l'interaction signature de la création de boutique.
 */
export function NomPeint({ name, placeholder, className }: { name: string; placeholder: string; className?: string }) {
  const reduce = useReducedMotion();
  const text = name.trim();
  if (!text) {
    return <span className={cn('lettrage text-white/30', className)}>{placeholder}</span>;
  }
  return (
    <span className={cn('lettrage block break-words', className)} aria-label={text}>
      {Array.from(text).map((char, index) => (
        <motion.span
          // La clé suit la position : seules les lettres nouvelles ou changées se repeignent.
          key={`${index}-${char}`}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)', y: 2 }}
          animate={{ clipPath: 'inset(0 0% 0 0)', y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

/** Plaque d'adresse vissée sur l'enseigne : l'URL du site de la boutique. */
export function PlaqueAdresse({ host, className }: { host: string; className?: string }) {
  return (
    <span
      className={cn(
        'chiffres inline-flex max-w-full items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[0.875rem] font-[650] text-baobab',
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-baobab" />
      <span className="truncate">{host}</span>
    </span>
  );
}

export const PLATFORM_ROOT_DOMAIN = (import.meta.env.VITE_PLATFORM_ROOT_DOMAIN as string | undefined) ?? 'localhost:3001';

export function siteHost(slug: string): string {
  return `${slug || 'votre-boutique'}.${PLATFORM_ROOT_DOMAIN}`;
}
