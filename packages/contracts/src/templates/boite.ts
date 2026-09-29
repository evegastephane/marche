import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « La boîte du téléphone » : chaque appareil présenté comme sa boîte d'origine.
 * Face avant épurée, étiquette latérale à cases cochées et code-barres de la référence. Pensé pour l'électronique.
 * Rôles : fond = carton, surface = étiquette, line = plis de la boîte, primary = cases cochées, prix et bouton,
 * accent = sceau de garantie.
 */
export const boiteTemplateManifest: TemplateManifest = {
  id: 'boite',
  name: 'La boîte du téléphone',
  version: '1.0.0',
  tagline: 'Chaque appareil comme sa boîte d’origine : la photo en façade, l’étiquette où l’on coche capacité, couleur et état.',
  storeTypes: ['ELECTRONICS'],
  fontChoice: false,
  palettes: [
    {
      id: 'carton-blanc',
      name: 'Carton blanc',
      colors: {
        background: '#F2F2EF',
        foreground: '#111111',
        muted: '#56585C',
        surface: '#FFFFFF',
        surfaceForeground: '#111111',
        line: '#D5D7DA',
        primary: '#1F56D8',
        accent: '#0F7A4B',
      },
    },
    {
      id: 'noir-mat',
      name: 'Noir mat',
      colors: {
        background: '#121212',
        foreground: '#F1F1EE',
        muted: '#A7A8A6',
        surface: '#1D1D1D',
        surfaceForeground: '#F1F1EE',
        line: '#333333',
        primary: '#6EA0FF',
        accent: '#F2C230',
      },
    },
    {
      id: 'kraft-recycle',
      name: 'Kraft recyclé',
      colors: {
        background: '#D9C4A3',
        foreground: '#1C1712',
        muted: '#4A3E30',
        surface: '#F1E6D3',
        surfaceForeground: '#1C1712',
        line: '#B39A75',
        primary: '#1D4C3A',
        accent: '#8A2418',
      },
    },
    {
      id: 'bleu-nuit',
      name: 'Bleu nuit',
      colors: {
        background: '#0E1A2B',
        foreground: '#EEF3F9',
        muted: '#A9B7C8',
        surface: '#172740',
        surfaceForeground: '#EEF3F9',
        line: '#2A3D5A',
        primary: '#F4C542',
        accent: '#7FD1B9',
      },
    },
    {
      id: 'menthe',
      name: 'Menthe',
      colors: {
        background: '#E2F0E8',
        foreground: '#0F2419',
        muted: '#3D5647',
        surface: '#F7FCF9',
        surfaceForeground: '#0F2419',
        line: '#B9D4C4',
        primary: '#0B6B3F',
        accent: '#1F4FB8',
      },
    },
    {
      id: 'corail',
      name: 'Corail',
      colors: {
        background: '#FBE8E1',
        foreground: '#2A1410',
        muted: '#6A4A44',
        surface: '#FFFFFF',
        surfaceForeground: '#2A1410',
        line: '#EBC7BC',
        primary: '#B8321F',
        accent: '#1E4A8C',
      },
    },
    {
      id: 'titane',
      name: 'Titane',
      colors: {
        background: '#D8DBDE',
        foreground: '#14171A',
        muted: '#444A51',
        surface: '#F1F2F3',
        surfaceForeground: '#14171A',
        line: '#B3B8BE',
        primary: '#0A55C8',
        accent: '#7A4B00',
      },
    },
  ],
};

export const boiteTemplate = defineTemplate(
  boiteTemplateManifest,
  starterSections({
    heroTitle: 'Arrivages',
    heroSubtitle: 'Neufs et reconditionnés, vérifiés et garantis. Cochez votre configuration, nous préparons la boîte.',
    heroCta: 'Voir les boîtes',
    featuredTitle: 'En rayon',
    gridTitle: 'Tous les appareils',
    aboutTitle: 'La boutique',
    aboutBody: 'Présentez ici votre boutique : vos garanties, vos réparations, où venir vous voir.',
  }),
);
