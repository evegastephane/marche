import type { StoreType } from '../verticals.js';
import { atelierTemplate } from './atelier.js';
import { boiteTemplate } from './boite.js';
import { couvertureTemplate } from './couverture.js';
import type { TemplateDefinition } from './define.js';
import { defaultTemplate, defaultTemplateManifest } from './default.js';
import { devantureTemplate } from './devanture.js';
import { enseigneTemplate } from './enseigne.js';
import { patronTemplate } from './patron.js';
import type { Palette, ThemeSettings } from './theme.js';
import { vitrineTemplate } from './vitrine.js';

export * from './theme.js';
export * from './color.js';
export * from './define.js';
export * from './default.js';
export * from './atelier.js';
export * from './vitrine.js';
export * from './devanture.js';
export * from './patron.js';
export * from './boite.js';
export * from './couverture.js';
export * from './enseigne.js';

/** Templates proposés, dans l'ordre de la galerie : le natif d'abord. */
export const TEMPLATE_LIST: readonly TemplateDefinition[] = [
  defaultTemplate,
  atelierTemplate,
  patronTemplate,
  couvertureTemplate,
  vitrineTemplate,
  boiteTemplate,
  enseigneTemplate,
  devantureTemplate,
];

export const TEMPLATES: Readonly<Record<string, TemplateDefinition>> = Object.fromEntries(
  TEMPLATE_LIST.map((template) => [template.manifest.id, template]),
);

export const DEFAULT_TEMPLATE_ID = defaultTemplateManifest.id;

export function getTemplate(templateId: string): TemplateDefinition | undefined {
  return TEMPLATES[templateId];
}

/** Templates pensés pour ce type de boutique d'abord, puis les autres (le natif convient aux deux). */
export function templatesFor(storeType: StoreType): { recommended: TemplateDefinition[]; others: TemplateDefinition[] } {
  const recommended = TEMPLATE_LIST.filter((t) => t.manifest.storeTypes.includes(storeType));
  return { recommended, others: TEMPLATE_LIST.filter((t) => !recommended.includes(t)) };
}

/** Palette d'un thème : celle choisie si elle appartient au template, sinon la première. */
export function resolvePalette(settings: Pick<ThemeSettings, 'template' | 'palette'>): Palette {
  const template = getTemplate(settings.template) ?? getTemplate(DEFAULT_TEMPLATE_ID)!;
  const palettes = template.manifest.palettes;
  return palettes.find((p) => p.id === settings.palette) ?? palettes[0]!;
}
