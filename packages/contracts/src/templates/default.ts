import { type ThemeSettings, themeSettingsBaseSchema } from './theme.js';

/**
 * Template « default » : preset cloné à la génération du site (pattern Prototype).
 * La maquette définitive remplacera le style côté storefront ; ce contrat reste stable.
 */
export const defaultTemplateManifest = {
  id: 'default',
  name: 'Défaut',
  version: '1.0.0',
} as const;

export const defaultTemplateSettingsSchema = themeSettingsBaseSchema;

export const defaultTemplateSettings: ThemeSettings = {
  colors: {
    primary: '#1F2937',
    background: '#FFFFFF',
    foreground: '#111827',
    accent: '#F59E0B',
  },
  fonts: { heading: 'DM Sans', body: 'Inter' },
  logoMediaId: null,
  announcement: { enabled: false, text: '' },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      title: 'Bienvenue dans notre boutique',
      subtitle: 'Découvrez nos produits sélectionnés avec soin.',
      ctaLabel: 'Voir les produits',
      ctaHref: '/collections',
      imageMediaId: null,
    },
    {
      id: 'featured',
      type: 'featured-collection',
      enabled: true,
      title: 'À la une',
      collectionId: null,
      limit: 8,
    },
    {
      id: 'grid',
      type: 'product-grid',
      enabled: true,
      title: 'Nouveautés',
      limit: 12,
      sort: 'newest',
    },
    {
      id: 'brands',
      type: 'brand-strip',
      enabled: false,
      title: 'Nos marques',
    },
    {
      id: 'about',
      type: 'rich-text',
      enabled: true,
      title: 'À propos',
      body: 'Présentez ici votre boutique, votre histoire et vos engagements.',
    },
  ],
};
