import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « Le patron de couture » : chaque article comme un modèle de patron vendu en mercerie.
 * Enveloppe en papier, grand numéro de référence, vues lettrées A, B, C, tableau des mesures. Pensé pour la mode.
 * Rôles : fond = enveloppe, surface = papier du patron, primary = rouge de tracé (le choix en cours),
 * accent = crayon graphite des annotations.
 */
export const patronTemplateManifest: TemplateManifest = {
  id: 'patron',
  name: 'Le patron de couture',
  version: '1.0.0',
  tagline: 'Chaque article comme un patron de couture : grand numéro de référence, vues A, B, C, tableau des mesures et coupon à découper.',
  storeTypes: ['FASHION'],
  fontChoice: false,
  palettes: [
    {
      id: 'manille',
      name: 'Enveloppe manille',
      colors: {
        background: '#E4D3B4',
        foreground: '#1A1714',
        muted: '#4F4436',
        surface: '#F6EEDD',
        surfaceForeground: '#1A1714',
        line: '#8A7453',
        primary: '#A3241D',
        accent: '#3A4A63',
      },
    },
    {
      id: 'papier-de-soie',
      name: 'Papier de soie',
      colors: {
        background: '#F4EEDF',
        foreground: '#1D1A16',
        muted: '#5A5246',
        surface: '#FFFCF4',
        surfaceForeground: '#1D1A16',
        line: '#A69677',
        primary: '#B42A24',
        accent: '#3B4A60',
      },
    },
    {
      id: 'kraft',
      name: 'Kraft',
      colors: {
        background: '#CDAE84',
        foreground: '#19130C',
        muted: '#3F3223',
        surface: '#E8D6B8',
        surfaceForeground: '#19130C',
        line: '#7A5E3A',
        primary: '#7A1812',
        accent: '#25324A',
      },
    },
    {
      id: 'bleu-calque',
      name: 'Calque bleu',
      colors: {
        background: '#D9E3EC',
        foreground: '#121C2A',
        muted: '#3F4C5E',
        surface: '#F1F5F9',
        surfaceForeground: '#121C2A',
        line: '#6F8196',
        primary: '#B32B26',
        accent: '#1E3A64',
      },
    },
    {
      id: 'vert-mercerie',
      name: 'Vert mercerie',
      colors: {
        background: '#D6DDCB',
        foreground: '#16200F',
        muted: '#414C38',
        surface: '#EEF2E7',
        surfaceForeground: '#16200F',
        line: '#7D8B6A',
        primary: '#A8261F',
        accent: '#2F3F57',
      },
    },
    {
      id: 'rose-dragee',
      name: 'Rose dragée',
      colors: {
        background: '#F1D8D0',
        foreground: '#2A1612',
        muted: '#5E423C',
        surface: '#FBEEE9',
        surfaceForeground: '#2A1612',
        line: '#B58C82',
        primary: '#A0222A',
        accent: '#34415A',
      },
    },
    {
      id: 'noir-tailleur',
      name: 'Noir tailleur',
      colors: {
        background: '#1C1A17',
        foreground: '#EFE4CF',
        muted: '#B9AD97',
        surface: '#292621',
        surfaceForeground: '#EFE4CF',
        line: '#6E6352',
        primary: '#FF6B57',
        accent: '#A9B8D0',
      },
    },
  ],
};

export const patronTemplate = defineTemplate(
  patronTemplateManifest,
  starterSections({
    heroTitle: 'Les nouveaux modèles',
    heroSubtitle: 'Chaque pièce avec ses coloris et son tableau des mesures : trouvez votre taille, nous préparons la commande.',
    heroCta: 'Voir les modèles',
    featuredTitle: 'Modèles du moment',
    gridTitle: 'Tous les modèles',
    aboutTitle: 'La maison',
    aboutBody: 'Présentez ici votre maison : vos tissus, vos coupes, ce que vous faites à la demande.',
  }),
);
