import { ADDABLE_SECTION_TYPES, type AddableSectionType, type Section, sectionAddBlocker } from '@marche/contracts';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { Dialog } from '@/shared/ui/dialog';
import { EASE_OUT } from '@/shared/ui/motion';
import { SECTION_KINDS } from './section-catalog';

/**
 * Choix d'une section à ajouter : une tuile par type, avec son croquis, son nom et ce qu'elle montre.
 * Un type déjà au maximum (une bannière, un contact) reste visible, éteint, avec la raison.
 */
export function AddSectionDialog({
  open,
  onOpenChange,
  sections,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: readonly Section[];
  onPick: (type: AddableSectionType) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Ajouter une section"
      description="Elle s’ajoute à cet endroit de la page d’accueil ; vous la réglez juste après."
    >
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {ADDABLE_SECTION_TYPES.map((type, index) => {
          const kind = SECTION_KINDS[type];
          const blocker = sectionAddBlocker(sections, type);
          return (
            <motion.li
              key={type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT, delay: 0.04 + index * 0.025 } }}
            >
              <button
                type="button"
                disabled={blocker !== null}
                onClick={() => onPick(type)}
                className={cn(
                  'group flex h-full w-full items-center gap-3.5 rounded-xl p-2.5 text-left transition-[background-color,box-shadow] duration-200',
                  'shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-surface-2 hover:shadow-[inset_0_0_0_1px_var(--color-line-strong)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
                )}
              >
                <span className="well flex h-[4.5rem] w-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-lg p-1 transition-transform duration-300 ease-out-soft group-enabled:group-hover:-translate-y-px">
                  {kind.sketch}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-[600]">{kind.name}</span>
                  <span className="text-[0.8125rem] leading-snug text-ink-2">{blocker ?? kind.description}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </Dialog>
  );
}
