import type { ThemeSettings } from '@marche/contracts';
import { DM_Sans, Inter, Lora, Montserrat, Nunito, Playfair_Display, Poppins, Space_Grotesk } from 'next/font/google';
import type { CSSProperties } from 'react';

// Les polices proposées dans l'éditeur de thème (FONT_CHOICES), auto-hébergées par next/font.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });

const FONTS: Record<ThemeSettings['fonts']['heading'], { variable: string; fallback: string }> = {
  Inter: { variable: inter.variable, fallback: 'sans-serif' },
  'DM Sans': { variable: dmSans.variable, fallback: 'sans-serif' },
  Poppins: { variable: poppins.variable, fallback: 'sans-serif' },
  Montserrat: { variable: montserrat.variable, fallback: 'sans-serif' },
  Nunito: { variable: nunito.variable, fallback: 'sans-serif' },
  'Space Grotesk': { variable: spaceGrotesk.variable, fallback: 'sans-serif' },
  'Playfair Display': { variable: playfair.variable, fallback: 'serif' },
  Lora: { variable: lora.variable, fallback: 'serif' },
};

/** Classes à poser sur <html> : déclare les variables de toutes les polices du catalogue. */
export const fontClassNames = Object.values(FONTS)
  .map((f) => f.variable)
  .join(' ');

function cssVarOf(font: ThemeSettings['fonts']['heading']): string {
  const entry = FONTS[font];
  // next/font expose une classe qui définit --font-xxx ; on relit la variable par son nom.
  const name = {
    Inter: '--font-inter',
    'DM Sans': '--font-dm-sans',
    Poppins: '--font-poppins',
    Montserrat: '--font-montserrat',
    Nunito: '--font-nunito',
    'Space Grotesk': '--font-space-grotesk',
    'Playfair Display': '--font-playfair',
    Lora: '--font-lora',
  }[font];
  return `var(${name}), ${entry.fallback}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texte lisible sur une couleur de fond : blanc ou quasi-noir, selon le meilleur contraste. */
export function readableOn(hex: string): string {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onDark = (l + 0.05) / (luminance('#111111') + 0.05);
  return onWhite >= onDark ? '#FFFFFF' : '#111111';
}

/** Variables CSS du thème du marchand, consommées par Tailwind (@theme inline). */
export function themeStyle(theme: ThemeSettings): CSSProperties {
  const { colors, fonts } = theme;
  return {
    '--sf-primary': colors.primary,
    '--sf-on-primary': readableOn(colors.primary),
    '--sf-accent': colors.accent,
    '--sf-on-accent': readableOn(colors.accent),
    '--sf-bg': colors.background,
    '--sf-fg': colors.foreground,
    '--sf-font-heading': cssVarOf(fonts.heading),
    '--sf-font-body': cssVarOf(fonts.body),
  } as CSSProperties;
}
