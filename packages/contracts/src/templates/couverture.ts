import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « La couverture de magazine » : la boutique publie son numéro du mois.
 * L'accueil est la une, le catalogue le sommaire, chaque fiche une page mode. Pensé pour la mode.
 * Rôles : accent = couleur de une (aplat de la couverture), surface = encadrés en seconde couleur franche et pastille « Nouveauté »,
 * primary = action et taille choisie (la couleur s'imprime), background = papier des pages intérieures.
 */
export const couvertureTemplateManifest: TemplateManifest = {
  id: 'couverture',
  name: 'La couverture de magazine',
  version: '1.0.0',
  tier: 'premium',
  tagline: 'Votre boutique comme le numéro du mois : la une à votre nom, vos articles en titres de couverture, chaque fiche en page mode.',
  storeTypes: ['FASHION'],
  fontChoice: false,
  palettes: [
    {
      id: 'fuchsia',
      name: 'Fuchsia',
      colors: {
        background: '#FFFFFF',
        foreground: '#151515',
        muted: '#5B5B5B',
        surface: '#FFE14D',
        surfaceForeground: '#151515',
        line: '#E6E1DA',
        primary: '#C2006A',
        accent: '#E4007C',
      },
    },
    {
      id: 'jaune-kiosque',
      name: 'Jaune kiosque',
      colors: {
        background: '#FFFFFF',
        foreground: '#121212',
        muted: '#585858',
        surface: '#FF7AB6',
        surfaceForeground: '#121212',
        line: '#E3E3E3',
        primary: '#121212',
        accent: '#FFD400',
      },
    },
    {
      id: 'rouge-une',
      name: 'Rouge de une',
      colors: {
        background: '#FFFFFF',
        foreground: '#161414',
        muted: '#5C5757',
        surface: '#9ED0FF',
        surfaceForeground: '#161414',
        line: '#E8E2E0',
        primary: '#B8231A',
        accent: '#D52B1E',
      },
    },
    {
      id: 'bleu-electrique',
      name: 'Bleu électrique',
      colors: {
        background: '#FFFFFF',
        foreground: '#10131F',
        muted: '#545A6B',
        surface: '#FFB3CF',
        surfaceForeground: '#10131F',
        line: '#E1E4EC',
        primary: '#2340E6',
        accent: '#2340E6',
      },
    },
    {
      id: 'vert-bouteille',
      name: 'Vert bouteille',
      colors: {
        background: '#F7F5F0',
        foreground: '#132019',
        muted: '#4F5A53',
        surface: '#FFD84D',
        surfaceForeground: '#132019',
        line: '#E2DED3',
        primary: '#0D6B45',
        accent: '#0D6B45',
      },
    },
    {
      id: 'orange-soleil',
      name: 'Orange soleil',
      colors: {
        background: '#FFFFFF',
        foreground: '#141210',
        muted: '#5A5652',
        surface: '#8FE3C2',
        surfaceForeground: '#141210',
        line: '#E6E1DC',
        primary: '#141210',
        accent: '#FF6B1A',
      },
    },
    {
      id: 'numero-de-nuit',
      name: 'Numéro de nuit',
      colors: {
        background: '#121212',
        foreground: '#F3F1EC',
        muted: '#A9A7A2',
        surface: '#FFD400',
        surfaceForeground: '#121212',
        line: '#34343A',
        primary: '#FF4FA3',
        accent: '#FF4FA3',
      },
    },
  ],
};

export const couvertureTemplate = defineTemplate(
  couvertureTemplateManifest,
  starterSections({
    heroTitle: 'La nouvelle collection',
    heroSubtitle: 'Les pièces du mois. Trouvez votre taille et commandez en quelques gestes.',
    heroCta: 'Feuilleter le numéro',
    featuredTitle: 'À la une',
    gridTitle: 'Les pages mode',
    aboutTitle: 'L’édito',
    aboutBody: 'Présentez ici votre boutique : votre style, vos tissus, votre atelier, où venir vous voir.',
  }),
);
