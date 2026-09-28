import { useSyncExternalStore } from 'react';

/**
 * Vrai quand la requête média correspond. Sert à ne rendre qu'une présentation (tableau ou liste)
 * là où deux présentations montées en même temps se disputeraient une même lumière partagée.
 */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    },
    () => window.matchMedia(query).matches,
  );
}
