import { motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { snappy } from './motion';

/**
 * Interrupteur : le curseur glisse sur un ressort, la piste se colore.
 * À placer dans un <label> qui porte le libellé : toute la ligne devient cliquable.
 */
export function Switch({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <span className={cn('relative mt-0.5 inline-flex shrink-0', className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          'flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
          checked ? 'justify-end bg-brand' : 'justify-start bg-line-strong',
        )}
      >
        <motion.span layout transition={snappy} className="size-5 rounded-full bg-white shadow-lift" />
      </span>
    </span>
  );
}
