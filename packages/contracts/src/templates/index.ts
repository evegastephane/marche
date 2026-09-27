import type { z } from 'zod';
import {
  defaultTemplateManifest,
  defaultTemplateSettings,
  defaultTemplateSettingsSchema,
} from './default.js';
import type { ThemeSettings } from './theme.js';

export * from './theme.js';
export * from './default.js';

export interface TemplateManifest {
  id: string;
  name: string;
  version: string;
}

/** Ce qu'un template expose à l'API : son manifeste, son schéma de réglages et son preset. */
export interface TemplateDefinition {
  manifest: TemplateManifest;
  settingsSchema: z.ZodType<ThemeSettings, unknown>;
  defaultSettings: ThemeSettings;
}

export const TEMPLATES: Readonly<Record<string, TemplateDefinition>> = {
  [defaultTemplateManifest.id]: {
    manifest: defaultTemplateManifest,
    settingsSchema: defaultTemplateSettingsSchema,
    defaultSettings: defaultTemplateSettings,
  },
};

export const DEFAULT_TEMPLATE_ID = defaultTemplateManifest.id;

export function getTemplate(templateId: string): TemplateDefinition | undefined {
  return TEMPLATES[templateId];
}
