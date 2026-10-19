/**
 * Nom de boutique tapé sur l'accueil du site vitrine (`?boutique=` sur l'inscription ou l'ouverture) :
 * gardé le temps de l'inscription, puis proposé dans le formulaire d'ouverture de boutique.
 */
const KEY = 'upsell:boutique';

export function rememberStoreName(search: string): void {
  const name = new URLSearchParams(search).get('boutique')?.trim().slice(0, 80);
  if (!name) return;
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    // Stockage bloqué (navigation privée) : le formulaire restera vide.
  }
}

export function pendingStoreName(): string {
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function forgetStoreName(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Rien à oublier.
  }
}
