import type { SiteDto, ThemeSettings } from '@marche/contracts';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { useSiteAction } from './api';

/**
 * Brouillon du thème en cours d'édition, partagé par les pages Site (le contenu) et Modèles (l'apparence) :
 * rien ne part avant « Enregistrer » ; « Publier » enregistre d'abord ce qui reste, puis met en ligne.
 */
export function useThemeDraft(site: SiteDto) {
  const action = useSiteAction();
  const [settings, setSettings] = useState<ThemeSettings>(() => structuredClone(site.draftThemeSettings));
  const [dirty, setDirty] = useState(false);
  // Le bouton qui a lancé l'action porte le chargement (Publier enchaîne enregistrement puis publication).
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);

  const edit = (next: ThemeSettings | ((current: ThemeSettings) => ThemeSettings)) => {
    setSettings(next);
    setDirty(true);
  };

  const fail = (error: unknown) => {
    setBusy(null);
    toast.error(errorMessage(error));
  };

  const publishTheme = () => {
    setBusy('publish');
    action.mutate(
      { type: 'publish-theme' },
      {
        onSuccess: () => {
          setBusy(null);
          toast('Modifications publiées sur votre site');
        },
        onError: fail,
      },
    );
  };

  const save = (thenPublish = false, next: ThemeSettings = settings, onSaved?: () => void) => {
    setBusy(thenPublish ? 'publish' : 'save');
    action.mutate(
      { type: 'save-theme', settings: next },
      {
        onSuccess: () => {
          setDirty(false);
          if (thenPublish) {
            publishTheme();
            return;
          }
          setBusy(null);
          toast('Brouillon enregistré', { description: 'Publiez pour l’afficher sur le site.' });
          onSaved?.();
        },
        onError: fail,
      },
    );
  };

  return {
    settings,
    edit,
    dirty,
    busy,
    /** Modifications en attente : pas encore enregistrées, ou enregistrées mais pas publiées. */
    hasChanges: dirty || site.hasUnpublishedChanges,
    /** Enregistre le brouillon ; `onSaved` suit une fois l'enregistrement accepté. */
    save: (onSaved?: () => void) => save(false, settings, onSaved),
    /** Enregistre des réglages précis (changement de modèle), sans attendre le prochain rendu. */
    saveSettings: (next: ThemeSettings) => {
      setSettings(next);
      save(false, next);
    },
    publish: () => (dirty ? save(true) : publishTheme()),
  };
}

export type ThemeDraft = ReturnType<typeof useThemeDraft>;
