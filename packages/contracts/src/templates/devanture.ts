import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « La devanture peinte » : la façade peinte à la main d'une boutique de quartier.
 * Mur en aplat, fronton en lettres de peintre, panneaux crème à double filet. Mode et électronique.
 * Rôles : fond = mur, foreground = lettrage sur le mur, surface = panneau, primary = porte et boutons.
 */
export const devantureTemplateManifest: TemplateManifest = {
  id: 'devanture',
  name: 'La devanture peinte',
  version: '1.0.0',
  tier: 'premium',
  tagline: 'Votre boutique comme une devanture peinte : le nom en grandes lettres, les rayons en enseignes, des couleurs franches.',
  storeTypes: ['FASHION', 'ELECTRONICS'],
  fontChoice: false,
  palettes: [
    {
      id: 'bleu-dakar',
      name: 'Bleu Dakar',
      colors: {
        background: '#1D5E9F',
        foreground: '#FFF6E3',
        muted: '#DCE8F5',
        surface: '#FFF6E3',
        surfaceForeground: '#141414',
        line: '#141414',
        primary: '#F4C20D',
        accent: '#D7263D',
      },
    },
    {
      id: 'jaune-soleil',
      name: 'Jaune soleil',
      colors: {
        background: '#F2BE0F',
        foreground: '#161616',
        muted: '#3B2F00',
        surface: '#FFFDF5',
        surfaceForeground: '#161616',
        line: '#161616',
        primary: '#1D4F9E',
        accent: '#C8231B',
      },
    },
    {
      id: 'vert-pharmacie',
      name: 'Vert pharmacie',
      colors: {
        background: '#157543',
        foreground: '#FFF8E6',
        muted: '#D8F0E1',
        surface: '#FFF8E6',
        surfaceForeground: '#122018',
        line: '#122018',
        primary: '#F4C20D',
        accent: '#D93427',
      },
    },
    {
      id: 'rouge-boutique',
      name: 'Rouge boutique',
      colors: {
        background: '#AE2219',
        foreground: '#FFF4E0',
        muted: '#FCDDD7',
        surface: '#FFF4E0',
        surfaceForeground: '#1C1413',
        line: '#1C1413',
        primary: '#F6C445',
        accent: '#1F4FA0',
      },
    },
    {
      id: 'rose-bonbon',
      name: 'Rose bonbon',
      colors: {
        background: '#F08DB2',
        foreground: '#1C1C4F',
        muted: '#26265E',
        surface: '#FFFFFF',
        surfaceForeground: '#1C1C4F',
        line: '#1C1C4F',
        primary: '#1C1C4F',
        accent: '#FFD23F',
      },
    },
    {
      id: 'turquoise',
      name: 'Turquoise',
      colors: {
        background: '#0C7277',
        foreground: '#FFF7E6',
        muted: '#D6F0EF',
        surface: '#FFF7E6',
        surfaceForeground: '#10272A',
        line: '#10272A',
        primary: '#F2542D',
        accent: '#FFD23F',
      },
    },
    {
      id: 'blanc-chaux',
      name: 'Blanc de chaux',
      colors: {
        background: '#F5F1E6',
        foreground: '#1A1A1A',
        muted: '#4D4A43',
        surface: '#FFFFFF',
        surfaceForeground: '#1A1A1A',
        line: '#1A1A1A',
        primary: '#1D5E9F',
        accent: '#C8231B',
      },
    },
  ],
};

export const devantureTemplate = defineTemplate(
  devantureTemplateManifest,
  starterSections({
    heroTitle: 'Entrez, c’est ouvert',
    heroSubtitle: 'Vêtements, chaussures, téléphones et accessoires : tout est en rayon, livré chez vous.',
    heroCta: 'Entrer',
    featuredTitle: 'En devanture',
    gridTitle: 'Tout le magasin',
    aboutTitle: 'La boutique',
    aboutBody: 'Présentez ici votre boutique : votre quartier, vos horaires, ce qui fait venir vos clients.',
  }),
);
