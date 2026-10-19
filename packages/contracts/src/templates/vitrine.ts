import { defineTemplate, starterSections, type TemplateManifest } from './define.js';

/**
 * « La vitrine du vendeur » : le comptoir vitré d'une boutique de téléphones.
 * Appareils sur présentoirs, étiquettes de prix, état écrit au marqueur. Pensé pour l'électronique.
 * Rôles : fond = lit du comptoir, surface = verre et panneaux, primary = étiquette de prix, accent = état.
 */
export const vitrineTemplateManifest: TemplateManifest = {
  id: 'vitrine',
  name: 'La vitrine du vendeur',
  version: '1.0.0',
  tier: 'premium',
  tagline: 'Votre boutique comme un comptoir vitré : appareils sur présentoirs, étiquettes de prix, état au marqueur.',
  storeTypes: ['ELECTRONICS'],
  sectors: ['telephones', 'audio', 'accessoires-tech'],
  styles: ['epure', 'lumineux'],
  addedAt: '2026-09-28',
  featured: true,
  fontChoice: false,
  palettes: [
    {
      id: 'comptoir-nuit',
      name: 'Comptoir de nuit',
      colors: {
        background: '#0C0F13',
        foreground: '#EEF2F6',
        muted: '#9AA5B1',
        surface: '#161B22',
        surfaceForeground: '#EEF2F6',
        line: '#28323D',
        primary: '#FFD23F',
        accent: '#3DD68C',
      },
    },
    {
      id: 'neon',
      name: 'Néon bleu',
      colors: {
        background: '#080B1A',
        foreground: '#EAF0FF',
        muted: '#A2ABCB',
        surface: '#111834',
        surfaceForeground: '#EAF0FF',
        line: '#252F5A',
        primary: '#4CD6FF',
        accent: '#FF6FA5',
      },
    },
    {
      id: 'rouge-promo',
      name: 'Rouge promo',
      colors: {
        background: '#121212',
        foreground: '#F5F5F5',
        muted: '#A9A9A9',
        surface: '#1E1E1E',
        surfaceForeground: '#F5F5F5',
        line: '#303030',
        primary: '#FF3B30',
        accent: '#FFD60A',
      },
    },
    {
      id: 'boutique-claire',
      name: 'Boutique claire',
      colors: {
        background: '#EEF1F4',
        foreground: '#101418',
        muted: '#525C67',
        surface: '#FFFFFF',
        surfaceForeground: '#101418',
        line: '#D8DEE4',
        primary: '#FFC700',
        accent: '#0B7A45',
      },
    },
    {
      id: 'orange',
      name: 'Orange opérateur',
      colors: {
        background: '#FFFFFF',
        foreground: '#151515',
        muted: '#595959',
        surface: '#F3F3F3',
        surfaceForeground: '#151515',
        line: '#E2E2E2',
        primary: '#FF6A00',
        accent: '#00704F',
      },
    },
    {
      id: 'menthe',
      name: 'Menthe',
      colors: {
        background: '#E8F4EF',
        foreground: '#0E2A21',
        muted: '#46655A',
        surface: '#FFFFFF',
        surfaceForeground: '#0E2A21',
        line: '#CBE2D8',
        primary: '#0E7C5E',
        accent: '#9A5B00',
      },
    },
    {
      id: 'titane',
      name: 'Titane',
      colors: {
        background: '#E5E5E1',
        foreground: '#1A1B1D',
        muted: '#53555A',
        surface: '#F5F5F2',
        surfaceForeground: '#1A1B1D',
        line: '#CCCCC6',
        primary: '#1A1B1D',
        accent: '#5B43C7',
      },
    },
  ],
};

export const vitrineTemplate = defineTemplate(
  vitrineTemplateManifest,
  starterSections({
    heroTitle: 'Neufs et reconditionnés, garantis',
    heroSubtitle: 'Choisissez le stockage, la couleur et l’état : le prix s’affiche aussitôt.',
    heroCta: 'Voir la vitrine',
    featuredTitle: 'En vitrine',
    gridTitle: 'Tous les appareils',
    aboutTitle: 'La boutique',
    aboutBody: 'Présentez ici votre boutique : vos garanties, vos réparations, ce que vous testez avant de vendre.',
  }),
);
