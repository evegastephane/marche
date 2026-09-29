'use client';

import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/format';

/**
 * Fenêtre native (<dialog>) : focus piégé, Échap et clic à l'extérieur pour fermer.
 * Au téléphone elle monte du bas ; chaque template lui donne son cadre.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Cadre propre au template (coins, filets, fond). */
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'm-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto bg-surface p-0 text-on-surface sm:m-auto sm:max-w-xl',
        'open:animate-[sf-sheet_0.32s_var(--ease-out-soft)] motion-reduce:open:animate-none',
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl leading-tight font-bold sm:text-2xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-on-surface/70 transition-colors hover:bg-on-surface/10 hover:text-on-surface"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
