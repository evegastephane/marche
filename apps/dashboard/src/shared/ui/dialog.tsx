import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Dialog as D } from 'radix-ui';
import type { ReactNode } from 'react';

/** Boîte de dialogue, réservée aux actions qui demandent une confirmation (annuler une commande…). */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-encre/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </D.Overlay>
            <D.Content asChild forceMount>
              <motion.div
                className="planche fixed inset-x-3 bottom-3 z-50 flex max-h-[85dvh] flex-col gap-5 overflow-y-auto p-6 shadow-flottant sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <D.Title className="titre text-[1.5rem] text-encre">{title}</D.Title>
                    {description && <D.Description className="text-encre-2">{description}</D.Description>}
                  </div>
                  <D.Close className="-m-1 rounded-md p-1 text-encre-2 hover:bg-chaux-2 hover:text-encre" aria-label="Fermer">
                    <X className="size-5" />
                  </D.Close>
                </div>
                {children}
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}
