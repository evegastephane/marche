import { motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { glide } from './motion';

/**
 * Interrupteur à glissière : le curseur glisse dans son rail en creux ;
 * allumé, le rail passe à l'encre. À placer dans un <label> qui porte le libellé :
 * toute la ligne devient cliquable.
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
          'flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
          checked ? 'justify-end bg-ink' : 'well justify-start',
        )}
      >
        <motion.span
          layout
          transition={glide}
          className="size-5 rounded-full bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)] dark:bg-[#3a3a40]"
        />
      </span>
    </span>
  );
}
