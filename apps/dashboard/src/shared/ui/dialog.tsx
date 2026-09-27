import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as D } from 'radix-ui';
import { type ReactNode, useSyncExternalStore } from 'react';
import { spring } from './motion';

const phoneQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)') : null;
function subscribePhone(listener: () => void) {
  phoneQuery?.addEventListener('change', listener);
  return () => phoneQuery?.removeEventListener('change', listener);
}

/**
 * Boîte de dialogue, réservée aux actions qui demandent une confirmation.
 * À l'ordinateur elle se pose au centre sur un ressort ; au téléphone c'est une feuille
 * qui monte du bas et se referme d'un glissement vers le bas.
 */
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
  const phone = useSyncExternalStore(subscribePhone, () => phoneQuery?.matches ?? false);
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </D.Overlay>
            <D.Content asChild forceMount>
              <motion.div
                className="card fixed inset-x-2 bottom-2 z-50 flex max-h-[88dvh] flex-col gap-5 overflow-y-auto rounded-3xl p-6 shadow-float sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
                initial={phone ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 8 }}
                animate={phone ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={phone ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 4 }}
                transition={spring}
                drag={phone ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 500) onOpenChange(false);
                }}
              >
                {phone && <span aria-hidden className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <D.Title className="heading text-[1.25rem]">{title}</D.Title>
                    {description && <D.Description className="text-ink-2">{description}</D.Description>}
                  </div>
                  <D.Close
                    className="-m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Fermer"
                  >
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
