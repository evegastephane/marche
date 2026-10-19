import { useBlocker } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import type { ThemeDraft } from './use-theme-draft';

/**
 * Quitter la page avec des réglages non enregistrés (aller de Site à Modèles, par exemple) :
 * on propose d'enregistrer d'abord, de quitter quand même, ou de rester.
 */
export function UnsavedGuard({ draft }: { draft: ThemeDraft }) {
  const blocker = useBlocker({
    // Changer de filtre ou ouvrir un essai change seulement la recherche de l'adresse : on ne bloque qu'en quittant la page.
    shouldBlockFn: ({ current, next }) => draft.dirty && current.pathname !== next.pathname,
    enableBeforeUnload: () => draft.dirty,
    withResolver: true,
  });
  const open = blocker.status === 'blocked';
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && blocker.reset?.()}
      title="Enregistrer avant de quitter ?"
      description="Vos derniers réglages ne sont pas encore enregistrés : sans enregistrement, ils seront perdus."
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={() => blocker.proceed?.()}>
          Quitter sans enregistrer
        </Button>
        <Button
          variant="primary"
          loading={draft.busy === 'save'}
          onClick={() => draft.save(() => blocker.proceed?.())}
        >
          Enregistrer et continuer
        </Button>
      </div>
    </Dialog>
  );
}
