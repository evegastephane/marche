import { defaultTemplateSettings, getTemplate } from '@marche/contracts';
import { describe, expect, it } from 'vitest';
import { parseThemeSettings, prefillSettings } from '../application/site.use-cases.js';
import { Site } from './site.aggregate.js';

const now = new Date('2026-09-27T10:00:00Z');

describe('prefillSettings (Prototype + préremplissage)', () => {
  it('personnalise une copie du preset sans modifier l’original', () => {
    const settings = prefillSettings(
      defaultTemplateSettings,
      { name: 'Chez Awa', logoMediaId: null },
      { id: '0190f3a0-0000-7000-8000-000000000001', title: 'Été' },
    );
    expect(settings.sections.find((s) => s.type === 'hero')).toMatchObject({ title: 'Bienvenue chez Chez Awa' });
    expect(settings.sections.find((s) => s.type === 'featured-collection')).toMatchObject({ title: 'Été', enabled: true });
    expect(defaultTemplateSettings.sections.find((s) => s.type === 'hero')).toMatchObject({
      title: 'Bienvenue dans notre boutique',
    });
  });

  it('désactive la section « à la une » sans catalogue publié', () => {
    const settings = prefillSettings(defaultTemplateSettings, { name: 'X', logoMediaId: null }, null);
    expect(settings.sections.find((s) => s.type === 'featured-collection')?.enabled).toBe(false);
  });

  it('valide des réglages avec le schéma du template', () => {
    const template = getTemplate('default');
    if (!template) throw new Error('template absent');
    expect(() => parseThemeSettings(template, { colors: 'rouge' })).toThrow(/Réglages de thème invalides/);
    expect(parseThemeSettings(template, defaultTemplateSettings)).toEqual(defaultTemplateSettings);
  });
});

describe('Site', () => {
  const generate = () =>
    Site.generate(
      { storeId: 's1', subdomain: 'chez-awa', templateId: 'default', templateVersion: '1.0.0', settings: defaultTemplateSettings },
      now,
    );

  it('naît publié avec un brouillon identique au thème en ligne', () => {
    const site = generate();
    expect(site.status).toBe('PUBLISHED');
    expect(site.hasUnpublishedChanges).toBe(false);
    expect(site.pullEvents().map((e) => e.type)).toEqual(['sites.site.published']);
  });

  it('publie le brouillon du thème', () => {
    const site = generate();
    const draft = structuredClone(defaultTemplateSettings);
    draft.colors.primary = '#000000';
    site.updateDraftTheme(draft, now);
    expect(site.hasUnpublishedChanges).toBe(true);
    site.publishTheme(now);
    expect(site.hasUnpublishedChanges).toBe(false);
    expect(site.snapshot().themeSettings.colors.primary).toBe('#000000');
  });

  it('se met hors ligne puis en ligne', () => {
    const site = generate();
    site.unpublish(now);
    expect(site.status).toBe('UNPUBLISHED');
    expect(() => site.unpublish(now)).toThrow();
    site.publish(now);
    expect(site.status).toBe('PUBLISHED');
  });
});
