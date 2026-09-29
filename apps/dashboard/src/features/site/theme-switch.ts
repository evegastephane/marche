import {
  getTemplate,
  type Section,
  type ThemeSettings,
} from '@marche/contracts';

const TEXT_KEYS = ['title', 'subtitle', 'ctaLabel', 'body'] as const;
const text = (section: object, key: string) =>
  (section as Record<string, unknown>)[key];

/**
 * Passe les réglages à un autre modèle : il prend sa première palette, et les textes d'accueil restés
 * ceux d'origine prennent les mots du nouveau modèle. Ce que le marchand a écrit reste tel quel.
 */
export function switchTemplate(
  settings: ThemeSettings,
  templateId: string,
): ThemeSettings {
  const next = getTemplate(templateId);
  if (!next || templateId === settings.template) return settings;
  const before = new Map(
    (getTemplate(settings.template)?.defaultSettings.sections ?? []).map(
      (s) => [s.id, s],
    ),
  );
  const after = new Map(next.defaultSettings.sections.map((s) => [s.id, s]));
  const sections = settings.sections.map((section) => {
    const from = before.get(section.id);
    const to = after.get(section.id);
    if (!from || !to || from.type !== section.type || to.type !== section.type)
      return section;
    const patch: Record<string, unknown> = {};
    for (const key of TEXT_KEYS) {
      // Le titre d'accueil est celui de la boutique (« Bienvenue chez … ») : il ne dépend pas du modèle.
      if (key === 'title' && section.type === 'hero') continue;
      const current = text(section, key);
      if (current !== undefined && current === text(from, key))
        patch[key] = text(to, key);
    }
    return { ...section, ...patch } as Section;
  });
  return {
    ...settings,
    template: templateId,
    palette: next.manifest.palettes[0]!.id,
    sections,
  };
}
