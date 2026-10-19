import type { z } from 'zod';
import type { StorePlan } from '../stores.js';
import type { StoreType } from '../verticals.js';
import { type Palette, type Section, type ThemeSettings, themeSettingsBaseSchema } from './theme.js';

/** Gratuit pour toutes les boutiques, ou réservé à la formule Premium. */
export type TemplateTier = 'free' | 'premium';

export interface TemplateManifest {
  id: string;
  name: string;
  version: string;
  tier: TemplateTier;
  /** Une phrase qui dit l'idée du template, affichée dans la galerie du dashboard. */
  tagline: string;
  /** Types de boutique pour lesquels il est pensé (les autres le voient aussi, plus bas). */
  storeTypes: readonly StoreType[];
  /** Palettes préréglées ; la première est celle d'origine. */
  palettes: readonly Palette[];
  /** Le marchand choisit ses polices (template natif) ; sinon elles font partie du template. */
  fontChoice: boolean;
}

/** Ce qu'un template expose à l'API : son manifeste, son schéma de réglages et son preset. */
export interface TemplateDefinition {
  manifest: TemplateManifest;
  settingsSchema: z.ZodType<ThemeSettings, unknown>;
  defaultSettings: ThemeSettings;
}

/** Une boutique peut-elle publier ce modèle ? Les modèles Premium demandent la formule Premium. */
export function canUseTemplate(plan: StorePlan, manifest: Pick<TemplateManifest, 'tier'>): boolean {
  return manifest.tier === 'free' || plan === 'PREMIUM';
}

/** Réglages d'un template : le template doit être le sien, la palette l'une des siennes. */
export function templateSettingsSchema(manifest: TemplateManifest): z.ZodType<ThemeSettings, unknown> {
  return themeSettingsBaseSchema.superRefine((settings, ctx) => {
    if (settings.template !== manifest.id) {
      ctx.addIssue({ code: 'custom', path: ['template'], message: `Réglages destinés au template ${manifest.id}` });
    }
    if (settings.palette && !manifest.palettes.some((p) => p.id === settings.palette)) {
      ctx.addIssue({ code: 'custom', path: ['palette'], message: 'Palette inconnue pour ce template' });
    }
  });
}

/** Sections d'accueil de départ, avec les mots propres au template. */
export function starterSections(copy: {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  featuredTitle: string;
  gridTitle: string;
  aboutTitle: string;
  aboutBody: string;
}): Section[] {
  return [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      title: copy.heroTitle,
      subtitle: copy.heroSubtitle,
      ctaLabel: copy.heroCta,
      ctaHref: '/collections',
      imageMediaId: null,
    },
    {
      id: 'featured',
      type: 'featured-collection',
      enabled: true,
      title: copy.featuredTitle,
      categoryId: null,
      collectionId: null,
      limit: 8,
    },
    { id: 'grid', type: 'product-grid', enabled: true, title: copy.gridTitle, limit: 12, sort: 'newest' },
    { id: 'brands', type: 'brand-strip', enabled: false, title: 'Nos marques' },
    { id: 'about', type: 'rich-text', enabled: true, title: copy.aboutTitle, body: copy.aboutBody },
  ];
}

export function defineTemplate(
  manifest: TemplateManifest,
  sections: Section[],
): TemplateDefinition {
  return {
    manifest,
    settingsSchema: templateSettingsSchema(manifest),
    defaultSettings: {
      template: manifest.id,
      palette: manifest.palettes[0]?.id ?? '',
      fonts: { heading: 'DM Sans', body: 'Inter' },
      logoMediaId: null,
      announcement: { enabled: false, text: '' },
      sections,
    },
  };
}
