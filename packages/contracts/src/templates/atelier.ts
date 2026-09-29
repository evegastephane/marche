import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « Le cahier du tailleur » : la boutique comme le cahier de commandes d'un atelier.
 * Papier ligné, encre bleue de stylo bille, tampon rouge. Pensé pour la mode.
 * Rôles : fond = papier, surface = bon et étiquette, accent = encre du stylo, primary = tampon.
 */
export const atelierTemplateManifest: TemplateManifest = {
  id: 'atelier',
  name: 'Le cahier du tailleur',
  version: '1.0.0',
  tagline: 'Votre boutique comme le cahier de l’atelier : photos collées, tailles entourées au stylo, bon de commande à détacher.',
  storeTypes: ['FASHION'],
  fontChoice: false,
  palettes: [
    {
      id: 'cahier-bleu',
      name: 'Cahier bleu',
      colors: {
        background: '#F8F5EE',
        foreground: '#1C2333',
        muted: '#525A6C',
        surface: '#EFE9DC',
        surfaceForeground: '#1C2333',
        line: '#C5D4EA',
        primary: '#B3302A',
        accent: '#1F3FA0',
      },
    },
    {
      id: 'kraft',
      name: 'Papier kraft',
      colors: {
        background: '#E7D7BB',
        foreground: '#241E17',
        muted: '#54483A',
        surface: '#F2E8D6',
        surfaceForeground: '#241E17',
        line: '#C8AF88',
        primary: '#9A2A21',
        accent: '#1B3787',
      },
    },
    {
      id: 'carbone',
      name: 'Papier carbone',
      colors: {
        background: '#EDEBF5',
        foreground: '#1B1934',
        muted: '#4D4A69',
        surface: '#FFFFFF',
        surfaceForeground: '#1B1934',
        line: '#C9C4E1',
        primary: '#B9392A',
        accent: '#3022A0',
      },
    },
    {
      id: 'bazin',
      name: 'Bazin blanc et or',
      colors: {
        background: '#FCFBF7',
        foreground: '#161616',
        muted: '#555555',
        surface: '#F2EEE3',
        surfaceForeground: '#161616',
        line: '#E0DACB',
        primary: '#161616',
        accent: '#8A6512',
      },
    },
    {
      id: 'rose-poudre',
      name: 'Rose poudré',
      colors: {
        background: '#F8EDEA',
        foreground: '#33191F',
        muted: '#6A4B52',
        surface: '#FFF8F6',
        surfaceForeground: '#33191F',
        line: '#E8CEC8',
        primary: '#AD2549',
        accent: '#284896',
      },
    },
    {
      id: 'indigo',
      name: 'Indigo',
      colors: {
        background: '#1C2847',
        foreground: '#F1EEE6',
        muted: '#BDC3D4',
        surface: '#26345A',
        surfaceForeground: '#F1EEE6',
        line: '#394C80',
        primary: '#F2C14E',
        accent: '#A9C8FF',
      },
    },
    {
      id: 'ardoise',
      name: 'Ardoise',
      colors: {
        background: '#1B1D21',
        foreground: '#ECE7DB',
        muted: '#ABA79D',
        surface: '#26292F',
        surfaceForeground: '#ECE7DB',
        line: '#3A3E47',
        primary: '#FF6A4A',
        accent: '#93B6FF',
      },
    },
  ],
};

export const atelierTemplate = defineTemplate(
  atelierTemplateManifest,
  starterSections({
    heroTitle: 'Nouveaux modèles',
    heroSubtitle: 'Coupés et cousus avec soin. Choisissez votre taille, nous préparons votre commande.',
    heroCta: 'Voir les modèles',
    featuredTitle: 'Les modèles du moment',
    gridTitle: 'Toutes les pièces',
    aboutTitle: 'L’atelier',
    aboutBody: 'Racontez ici votre atelier : vos tissus, vos finitions, ce que vous faites sur mesure.',
  }),
);
