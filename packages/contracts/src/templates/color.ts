/**
 * Calculs de couleur partagés (API, dashboard, sites) : luminance relative et contraste WCAG,
 * pour garantir qu'une palette reste lisible et choisir le texte posé sur une couleur.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminance relative d'une couleur #RRGGBB (0 = noir, 1 = blanc). */
export function luminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const WHITE = '#FFFFFF';
const INK = '#111111';

/** Texte lisible sur une couleur : blanc ou quasi-noir, selon le meilleur contraste. */
export function readableOn(hex: string): string {
  return contrastRatio(hex, WHITE) >= contrastRatio(hex, INK) ? WHITE : INK;
}
