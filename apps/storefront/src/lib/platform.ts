/** Adresses de la plateforme Upsell (pages du domaine racine), lues à la construction. */
export const DASHBOARD_URL = (
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5173'
).replace(/\/+$/, '');
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3001';
export const SIGN_IN_URL = `${DASHBOARD_URL}/sign-in`;

/** Inscription ; le nom tapé sur l'accueil suit jusqu'à l'ouverture de la boutique. */
export function signUpUrl(storeName: string): string {
  const name = storeName.trim();
  return name
    ? `${DASHBOARD_URL}/sign-up?boutique=${encodeURIComponent(name)}`
    : `${DASHBOARD_URL}/sign-up`;
}

/** Adresse proposée pour un nom de boutique : la même règle que l'ouverture de boutique du tableau de bord. */
export function storeSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** Thème choisi par le visiteur sur les pages de la plateforme (clair ou sombre ; absent = comme l'appareil). */
export const THEME_STORAGE_KEY = 'upsell-theme';

/**
 * Appliqué avant le premier affichage (script de la mise en page racine) sur <html>, pour ne jamais montrer
 * l'autre thème le temps du chargement. Chaque boutique a son sous-domaine, donc son propre stockage :
 * ce choix ne touche que les pages de la plateforme.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.upTheme=t}catch(e){}`;
