import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « L'enseigne lumineuse » : la devanture du vendeur de téléphones, le soir.
 * Le nom et les services défilent en points LED, chaque prix s'allume en chiffres à sept segments,
 * les appareils se regardent sur l'étal éclairé. Pensé pour l'électronique.
 * Rôles : background = la boutique (de nuit, ou mur clair), surface = l'étal éclairé sous les photos,
 * primary = la couleur des LED (enseigne, prix, action), accent = la seconde LED (promotions, alertes).
 */
export const enseigneTemplateManifest: TemplateManifest = {
  id: 'enseigne',
  name: 'L’enseigne lumineuse',
  version: '1.0.0',
  tier: 'premium',
  tagline: 'Votre boutique comme une enseigne LED le soir : le nom qui défile, les prix en chiffres lumineux, les appareils sur l’étal éclairé.',
  storeTypes: ['ELECTRONICS'],
  sectors: ['telephones', 'audio', 'gaming'],
  styles: ['lumineux', 'audacieux'],
  addedAt: '2026-09-30',
  featured: true,
  fontChoice: false,
  palettes: [
    {
      id: 'led-rouge',
      name: 'LED rouge',
      colors: {
        background: '#0C0C0D',
        foreground: '#F2F2F0',
        muted: '#A3A3A3',
        surface: '#F4F4F1',
        surfaceForeground: '#141414',
        line: '#2A2A2C',
        primary: '#FF3B2F',
        accent: '#FFB21A',
      },
    },
    {
      id: 'ambre',
      name: 'Ambre',
      colors: {
        background: '#100D08',
        foreground: '#F5EFE4',
        muted: '#ABA396',
        surface: '#F6F1E7',
        surfaceForeground: '#17130C',
        line: '#2E271C',
        primary: '#FFB21A',
        accent: '#FF5A36',
      },
    },
    {
      id: 'vert-afficheur',
      name: 'Vert afficheur',
      colors: {
        background: '#07100B',
        foreground: '#E9F5EE',
        muted: '#9DB1A5',
        surface: '#F1F6F2',
        surfaceForeground: '#0E1A13',
        line: '#1D2E24',
        primary: '#2BE36B',
        accent: '#FFD23F',
      },
    },
    {
      id: 'bleu-neon',
      name: 'Bleu néon',
      colors: {
        background: '#080C18',
        foreground: '#EEF2FB',
        muted: '#A2ACC2',
        surface: '#F2F4F9',
        surfaceForeground: '#0E1426',
        line: '#1E2740',
        primary: '#3DA5FF',
        accent: '#FF4FB0',
      },
    },
    {
      id: 'blanc-froid',
      name: 'Blanc froid',
      colors: {
        background: '#0E0F11',
        foreground: '#F4F5F7',
        muted: '#A6A9AE',
        surface: '#F4F5F7',
        surfaceForeground: '#121316',
        line: '#2A2C31',
        primary: '#F4F5F7',
        accent: '#FF3B2F',
      },
    },
    {
      id: 'violet',
      name: 'Violet',
      colors: {
        background: '#0E0A14',
        foreground: '#F3EFF8',
        muted: '#A9A1B6',
        surface: '#F5F2F9',
        surfaceForeground: '#150F1E',
        line: '#2A2236',
        primary: '#C77DFF',
        accent: '#FFB21A',
      },
    },
    {
      id: 'mur-blanc',
      name: 'Mur blanc',
      colors: {
        background: '#EEEEEA',
        foreground: '#151515',
        muted: '#585854',
        surface: '#FFFFFF',
        surfaceForeground: '#151515',
        line: '#D2D2CC',
        primary: '#C8161D',
        accent: '#0A5FC4',
      },
    },
  ],
};

export const enseigneTemplate = defineTemplate(
  enseigneTemplateManifest,
  starterSections({
    heroTitle: 'Arrivages',
    heroSubtitle: 'Neufs et reconditionnés. Choisissez votre modèle et sa configuration, nous le préparons.',
    heroCta: 'Voir les appareils',
    featuredTitle: 'En vitrine',
    gridTitle: 'Tableau des prix',
    aboutTitle: 'La boutique',
    aboutBody: 'Présentez ici votre boutique : vos garanties, vos réparations, vos horaires, où venir vous voir.',
  }),
);
