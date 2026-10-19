import type { SiteDto } from '@marche/contracts';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import type { ThemeDraft } from './use-theme-draft';

/**
 * Barre d'état du brouillon : témoin et phrase (non enregistré, prêt à publier, à jour),
 * puis Enregistrer et Publier. Publier porte la touche orange tant qu'il y a quelque chose à mettre en ligne.
 */
export function PublishBar({ site, draft, className }: { site: SiteDto; draft: ThemeDraft; className?: string }) {
  const online = site.status === 'PUBLISHED';
  const state = draft.dirty ? 'dirty' : site.hasUnpublishedChanges ? 'draft' : 'ok';
  return (
    <div className={cn('panel flex flex-wrap items-center justify-between gap-3 p-4', className)}>
      <span className="flex items-center gap-2 text-[0.875rem] text-ink-2" aria-live="polite">
        <motion.span
          aria-hidden
          className="inline-flex"
          animate={{ scale: draft.dirty ? [1, 1.4, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Led tone={state === 'dirty' ? 'attention' : state === 'draft' ? 'draft' : 'on'} />
        </motion.span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {state === 'dirty'
              ? 'Modifications non enregistrées'
              : state === 'draft'
                ? 'Brouillon prêt à publier'
                : 'Le site est à jour'}
          </motion.span>
        </AnimatePresence>
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!draft.dirty || draft.busy !== null}
          loading={draft.busy === 'save'}
          onClick={() => draft.save()}
        >
          Enregistrer
        </Button>
        <Button
          variant={online && draft.hasChanges ? 'primary' : 'secondary'}
          disabled={!draft.hasChanges || draft.busy !== null}
          loading={draft.busy === 'publish'}
          onClick={draft.publish}
        >
          Publier
        </Button>
      </div>
    </div>
  );
}
