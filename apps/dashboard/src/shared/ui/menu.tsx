import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DropdownMenu as DM } from 'radix-ui';
import { createContext, type ReactNode, useContext, useId, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { EASE_OUT, glide } from './motion';

/** Option survolée ou atteinte au clavier : le curseur glisse jusqu'à elle. */
const HighlightContext = createContext<{
  group: string;
  highlighted: string | null;
  setHighlighted: (id: string | null) => void;
} | null>(null);

/**
 * Menu déroulant de l'instrument : le panneau sort de son déclencheur (il grandit depuis lui,
 * aligné sur lui), et un curseur glisse sous l'option survolée ou atteinte au clavier.
 * Clavier, focus et fermeture sont ceux de Radix ; le mouvement se réduit avec le réglage de l'appareil.
 */
export function Menu({
  trigger,
  label,
  children,
  side = 'bottom',
  align = 'start',
  matchTriggerWidth = false,
  className,
}: {
  trigger: ReactNode;
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'start' | 'end';
  /** Le panneau prend la largeur du déclencheur (au moins 16 rem) : les deux forment un seul objet. */
  matchTriggerWidth?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const group = useId();
  const reduce = useReducedMotion();
  const shift = side === 'bottom' ? -6 : 6;

  return (
    <DM.Root open={open} onOpenChange={setOpen} modal={false}>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <AnimatePresence>
        {open && (
          <DM.Portal forceMount>
            <DM.Content
              asChild
              forceMount
              side={side}
              align={align}
              sideOffset={6}
              collisionPadding={12}
              aria-label={label}
              onPointerLeave={() => setHighlighted(null)}
            >
              <motion.div
                className={cn(
                  'z-50 flex flex-col gap-0.5 rounded-[14px] bg-surface p-1.5 shadow-menu ring-1 ring-line outline-none',
                  matchTriggerWidth
                    ? 'w-[max(var(--radix-dropdown-menu-trigger-width),16rem)]'
                    : 'w-[min(19rem,calc(100vw-1.5rem))]',
                  className,
                )}
                style={{ transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)' }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: shift, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: shift / 2, scale: 0.98 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <HighlightContext.Provider value={{ group, highlighted, setHighlighted }}>
                  {children}
                </HighlightContext.Provider>
              </motion.div>
            </DM.Content>
          </DM.Portal>
        )}
      </AnimatePresence>
    </DM.Root>
  );
}

/** Option : pictogramme, libellé, précision facultative, témoin à droite. */
export function MenuItem({
  icon: Icon,
  leading,
  children,
  hint,
  trailing,
  onSelect,
  danger = false,
  loading = false,
  disabled = false,
}: {
  icon?: LucideIcon;
  /** Élément de tête à la place du pictogramme (vignette de boutique, avatar). */
  leading?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  trailing?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const ctx = useContext(HighlightContext);
  const id = useId();
  const lit = ctx?.highlighted === id;
  return (
    <DM.Item
      disabled={disabled || loading}
      onSelect={onSelect}
      onFocus={() => ctx?.setHighlighted(id)}
      onPointerMove={() => ctx?.setHighlighted(id)}
      className={cn(
        'relative flex min-h-10 cursor-pointer items-center gap-3 rounded-[0.6rem] px-2.5 py-2 text-[0.875rem] font-[560] outline-none select-none data-[disabled]:cursor-default data-[disabled]:opacity-50 max-md:min-h-11',
        danger ? 'text-danger-ink' : 'text-ink',
      )}
    >
      {lit && (
        <motion.span
          layoutId={`${ctx?.group}-knob`}
          aria-hidden
          className="absolute inset-0 rounded-[0.6rem] bg-surface-2 shadow-[inset_0_0_0_1px_var(--color-line)]"
          transition={glide}
        />
      )}
      {leading ??
        (Icon && (
          <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
            {loading ? (
              <LoaderCircle className="size-[1.05rem] animate-spin text-ink-3" aria-hidden />
            ) : (
              <Icon className={cn('size-[1.05rem]', danger ? 'text-danger-ink' : 'text-ink-3')} strokeWidth={1.8} />
            )}
          </span>
        ))}
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="truncate">{children}</span>
        {hint && <span className="truncate text-[0.75rem] font-[450] text-ink-3">{hint}</span>}
      </span>
      {trailing && <span className="relative flex shrink-0 items-center">{trailing}</span>}
    </DM.Item>
  );
}

/** Légende d'un groupe d'options. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="legend px-2.5 pt-1.5 pb-1">{children}</DM.Label>;
}

export function MenuSeparator() {
  return <DM.Separator className="mx-1 my-1 h-px bg-line" />;
}

/** Bloc d'en-tête non interactif (identité du compte). */
export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">{children}</div>;
}
