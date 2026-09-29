import { defineTemplate, starterSections, type TemplateManifest } from './define.js';
import type { ThemeSettings } from './theme.js';

/**
 * Template natif : épuré, bandeau d'accueil plein, cartes produit arrondies.
 * Le seul qui laisse le marchand choisir ses polices. Pensé pour tous les types de boutique.
 */
export const defaultTemplateManifest: TemplateManifest = {
  id: 'default',
  name: 'Natif',
  version: '2.0.0',
  tagline: 'Épuré et polyvalent : un grand bandeau d’accueil, des photos généreuses, vos polices.',
  storeTypes: ['FASHION', 'ELECTRONICS'],
  fontChoice: true,
  palettes: [
    {
      id: 'upsell',
      name: 'Encre et orange',
      colors: {
        background: '#FFFFFF',
        foreground: '#101115',
        muted: '#595B62',
        surface: '#F4F4F1',
        surfaceForeground: '#101115',
        line: '#E4E4E0',
        primary: '#101115',
        accent: '#F66B21',
      },
    },
    {
      id: 'sable',
      name: 'Sable',
      colors: {
        background: '#F6F1E9',
        foreground: '#231F1A',
        muted: '#665D52',
        surface: '#EDE4D6',
        surfaceForeground: '#231F1A',
        line: '#DDD2C1',
        primary: '#231F1A',
        accent: '#C4602F',
      },
    },
    {
      id: 'nuit',
      name: 'Nuit',
      colors: {
        background: '#0F1013',
        foreground: '#F2F2EF',
        muted: '#A3A5AD',
        surface: '#1A1C21',
        surfaceForeground: '#F2F2EF',
        line: '#2A2C33',
        primary: '#F2F2EF',
        accent: '#F66B21',
      },
    },
    {
      id: 'foret',
      name: 'Forêt',
      colors: {
        background: '#F3F5F1',
        foreground: '#15261C',
        muted: '#526357',
        surface: '#E5EBE2',
        surfaceForeground: '#15261C',
        line: '#D3DCCF',
        primary: '#1F5A3A',
        accent: '#E0A526',
      },
    },
    {
      id: 'ocean',
      name: 'Océan',
      colors: {
        background: '#F2F6FA',
        foreground: '#0E1E2E',
        muted: '#4F6177',
        surface: '#E2EAF3',
        surfaceForeground: '#0E1E2E',
        line: '#D1DCE8',
        primary: '#12467A',
        accent: '#FF7A59',
      },
    },
    {
      id: 'prune',
      name: 'Prune',
      colors: {
        background: '#FAF6F8',
        foreground: '#2A1022',
        muted: '#6B5263',
        surface: '#F0E6EC',
        surfaceForeground: '#2A1022',
        line: '#E4D5DE',
        primary: '#6B1E52',
        accent: '#F2A541',
      },
    },
  ],
};

const definition = defineTemplate(
  defaultTemplateManifest,
  starterSections({
    heroTitle: 'Bienvenue dans notre boutique',
    heroSubtitle: 'Découvrez nos produits sélectionnés avec soin.',
    heroCta: 'Voir les produits',
    featuredTitle: 'À la une',
    gridTitle: 'Nouveautés',
    aboutTitle: 'À propos',
    aboutBody: 'Présentez ici votre boutique, votre histoire et vos engagements.',
  }),
);

export const defaultTemplate = definition;
export const defaultTemplateSettingsSchema = definition.settingsSchema;
export const defaultTemplateSettings: ThemeSettings = definition.defaultSettings;
