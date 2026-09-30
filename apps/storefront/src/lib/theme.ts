import { readableOn, resolvePalette, type ThemeSettings } from '@marche/contracts';
import localFont from 'next/font/local';
import type { CSSProperties } from 'react';

/*
 * Polices hébergées dans le projet (src/fonts, sous-ensemble latin, accents français compris, licences libres
 * OFL de Google Fonts) : aucune requête vers Google à la compilation ni chez l'acheteur, et les sites gardent
 * leurs polices hors ligne ou sur une connexion lente. Les fichiers variables portent leurs axes (largeur,
 * taille optique, arrondi des points).
 */

// Polices au choix du template natif (FONT_CHOICES).
const inter = localFont({ src: '../fonts/inter-normal-100-900.woff2', weight: '100 900', variable: '--font-inter', display: 'swap' });
const dmSans = localFont({ src: '../fonts/dm-sans-normal-100-1000.woff2', weight: '100 1000', variable: '--font-dm-sans', display: 'swap' });
const poppins = localFont({
  src: [
    { path: '../fonts/poppins-normal-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/poppins-normal-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/poppins-normal-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/poppins-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
  preload: false,
});
const montserrat = localFont({ src: '../fonts/montserrat-normal-100-900.woff2', weight: '100 900', variable: '--font-montserrat', display: 'swap', preload: false });
const nunito = localFont({ src: '../fonts/nunito-normal-200-1000.woff2', weight: '200 1000', variable: '--font-nunito', display: 'swap', preload: false });
const spaceGrotesk = localFont({ src: '../fonts/space-grotesk-normal-300-700.woff2', weight: '300 700', variable: '--font-space-grotesk', display: 'swap', preload: false });
const playfair = localFont({
  src: '../fonts/playfair-display-normal-400-900.woff2',
  weight: '400 900',
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});
const lora = localFont({
  src: '../fonts/lora-normal-400-700.woff2',
  weight: '400 700',
  variable: '--font-lora',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

// Polices imposées par les templates : elles font partie de leur monde.
const archivo = localFont({ src: '../fonts/archivo-normal-100-900.woff2', weight: '100 900', variable: '--font-archivo', display: 'swap', preload: false });
const kalam = localFont({
  src: [
    { path: '../fonts/kalam-normal-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/kalam-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-kalam',
  display: 'swap',
  preload: false,
});
const barlow = localFont({
  src: [
    { path: '../fonts/barlow-normal-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/barlow-normal-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/barlow-normal-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/barlow-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-barlow',
  display: 'swap',
  preload: false,
});
const barlowCondensed = localFont({
  src: [
    { path: '../fonts/barlow-condensed-normal-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/barlow-condensed-normal-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/barlow-condensed-normal-700.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/barlow-condensed-normal-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-barlow-condensed',
  display: 'swap',
  preload: false,
});
const marker = localFont({ src: '../fonts/permanent-marker-normal-400.woff2', weight: '400', variable: '--font-marker', display: 'swap', preload: false });
const alfaSlab = localFont({
  src: '../fonts/alfa-slab-one-normal-400.woff2',
  weight: '400',
  variable: '--font-alfa-slab',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});
const karla = localFont({ src: '../fonts/karla-normal-200-800.woff2', weight: '200 800', variable: '--font-karla', display: 'swap', preload: false });
const anybody = localFont({ src: '../fonts/anybody-normal-100-900.woff2', weight: '100 900', variable: '--font-anybody', display: 'swap', preload: false });
const franklin = localFont({ src: '../fonts/libre-franklin-normal-100-900.woff2', weight: '100 900', variable: '--font-franklin', display: 'swap', preload: false });
const geist = localFont({ src: '../fonts/geist-normal-100-900.woff2', weight: '100 900', variable: '--font-geist', display: 'swap', preload: false });
const geistMono = localFont({ src: '../fonts/geist-mono-normal-100-900.woff2', weight: '100 900', variable: '--font-geist-mono', display: 'swap', preload: false });
const bigShoulders = localFont({ src: '../fonts/big-shoulders-normal-100-900.woff2', weight: '100 900', variable: '--font-big-shoulders', display: 'swap', preload: false });
const schibsted = localFont({
  src: [
    { path: '../fonts/schibsted-grotesk-normal-400-900.woff2', weight: '400 900', style: 'normal' },
    { path: '../fonts/schibsted-grotesk-italic-400-900.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--font-schibsted',
  display: 'swap',
  preload: false,
});
const doto = localFont({ src: '../fonts/doto-normal-100-900.woff2', weight: '100 900', variable: '--font-doto', display: 'swap', preload: false });
const atkinson = localFont({
  src: '../fonts/atkinson-hyperlegible-next-normal-200-800.woff2',
  weight: '200 800',
  variable: '--font-atkinson',
  display: 'swap',
  preload: false,
});

/** Classes à poser sur <html> : déclarent les variables de toutes les polices. */
export const fontClassNames = [
  inter,
  dmSans,
  poppins,
  montserrat,
  nunito,
  spaceGrotesk,
  playfair,
  lora,
  archivo,
  kalam,
  barlow,
  barlowCondensed,
  marker,
  alfaSlab,
  karla,
  anybody,
  franklin,
  geist,
  geistMono,
  bigShoulders,
  schibsted,
  doto,
  atkinson,
]
  .map((f) => f.variable)
  .join(' ');

const CHOICE_VARS: Record<ThemeSettings['fonts']['heading'], string> = {
  Inter: 'var(--font-inter), sans-serif',
  'DM Sans': 'var(--font-dm-sans), sans-serif',
  Poppins: 'var(--font-poppins), sans-serif',
  Montserrat: 'var(--font-montserrat), sans-serif',
  Nunito: 'var(--font-nunito), sans-serif',
  'Space Grotesk': 'var(--font-space-grotesk), sans-serif',
  'Playfair Display': 'var(--font-playfair), serif',
  Lora: 'var(--font-lora), serif',
};

/** Polices des templates : titres, texte, et une voix « à la main » (stylo, marqueur, pinceau). */
const TEMPLATE_FONTS: Record<string, { heading: string; body: string; hand: string } | undefined> = {
  atelier: {
    heading: 'var(--font-archivo), sans-serif',
    body: 'var(--font-archivo), sans-serif',
    hand: 'var(--font-kalam), cursive',
  },
  vitrine: {
    heading: 'var(--font-barlow-condensed), sans-serif',
    body: 'var(--font-barlow), sans-serif',
    hand: 'var(--font-marker), cursive',
  },
  devanture: {
    heading: 'var(--font-alfa-slab), serif',
    body: 'var(--font-karla), sans-serif',
    hand: 'var(--font-alfa-slab), serif',
  },
  // Numéros d'enveloppe en grande grotesque large (Anybody), texte de notice en Franklin.
  patron: {
    heading: 'var(--font-anybody), sans-serif',
    body: 'var(--font-franklin), sans-serif',
    hand: 'var(--font-anybody), sans-serif',
  },
  // Face de boîte en Geist, étiquette (données, références) en Geist Mono.
  boite: {
    heading: 'var(--font-geist), sans-serif',
    body: 'var(--font-geist), sans-serif',
    hand: 'var(--font-geist-mono), monospace',
  },
  // Titre de magazine et titres de couverture en Big Shoulders très gras, texte et crédits en Schibsted Grotesk.
  couverture: {
    heading: 'var(--font-big-shoulders), sans-serif',
    body: 'var(--font-schibsted), sans-serif',
    hand: 'var(--font-big-shoulders), sans-serif',
  },
  // Enseigne en points LED (Doto), tout le texte en Atkinson Hyperlegible, lisible sur un petit écran le soir.
  enseigne: {
    heading: 'var(--font-doto), monospace',
    body: 'var(--font-atkinson), sans-serif',
    hand: 'var(--font-atkinson), sans-serif',
  },
};

/** Variables CSS du thème de la boutique : la palette choisie et les polices du template. */
export function themeStyle(theme: ThemeSettings): CSSProperties {
  const { colors } = resolvePalette(theme);
  const fonts = TEMPLATE_FONTS[theme.template] ?? {
    heading: CHOICE_VARS[theme.fonts.heading],
    body: CHOICE_VARS[theme.fonts.body],
    hand: CHOICE_VARS[theme.fonts.heading],
  };
  return {
    '--sf-bg': colors.background,
    '--sf-fg': colors.foreground,
    '--sf-muted': colors.muted,
    '--sf-surface': colors.surface,
    '--sf-surface-fg': colors.surfaceForeground,
    '--sf-line': colors.line,
    '--sf-primary': colors.primary,
    '--sf-on-primary': readableOn(colors.primary),
    '--sf-accent': colors.accent,
    '--sf-on-accent': readableOn(colors.accent),
    '--sf-font-heading': fonts.heading,
    '--sf-font-body': fonts.body,
    '--sf-font-hand': fonts.hand,
    colorScheme: readableOn(colors.background) === '#FFFFFF' ? 'dark' : 'light',
  } as CSSProperties;
}
