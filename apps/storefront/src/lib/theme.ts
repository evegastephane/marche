import { readableOn, resolvePalette, type ThemeSettings } from '@marche/contracts';
import {
  Alfa_Slab_One,
  Anybody,
  Archivo,
  Atkinson_Hyperlegible_Next,
  Barlow,
  Barlow_Condensed,
  Big_Shoulders,
  DM_Sans,
  Doto,
  Geist,
  Geist_Mono,
  Inter,
  Kalam,
  Karla,
  Libre_Franklin,
  Lora,
  Montserrat,
  Nunito,
  Permanent_Marker,
  Playfair_Display,
  Poppins,
  Schibsted_Grotesk,
  Space_Grotesk,
} from 'next/font/google';
import type { CSSProperties } from 'react';

// Polices au choix du template natif (FONT_CHOICES), auto-hébergées par next/font.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap', preload: false });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap', preload: false });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap', preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap', preload: false });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap', preload: false });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap', preload: false });

// Polices imposées par les templates : elles font partie de leur monde.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap', preload: false });
const kalam = Kalam({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-kalam', display: 'swap', preload: false });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-barlow', display: 'swap', preload: false });
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
  preload: false,
});
const marker = Permanent_Marker({ subsets: ['latin'], weight: '400', variable: '--font-marker', display: 'swap', preload: false });
const alfaSlab = Alfa_Slab_One({ subsets: ['latin'], weight: '400', variable: '--font-alfa-slab', display: 'swap', preload: false });
const karla = Karla({ subsets: ['latin'], variable: '--font-karla', display: 'swap', preload: false });
const anybody = Anybody({ subsets: ['latin'], axes: ['wdth'], variable: '--font-anybody', display: 'swap', preload: false });
const franklin = Libre_Franklin({ subsets: ['latin'], variable: '--font-franklin', display: 'swap', preload: false });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap', preload: false });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false });
const bigShoulders = Big_Shoulders({ subsets: ['latin'], axes: ['opsz'], variable: '--font-big-shoulders', display: 'swap', preload: false });
const schibsted = Schibsted_Grotesk({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-schibsted', display: 'swap', preload: false });
const doto = Doto({ subsets: ['latin'], axes: ['ROND'], variable: '--font-doto', display: 'swap', preload: false });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson', display: 'swap', preload: false });

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
