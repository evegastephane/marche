import { describe, expect, it } from 'vitest';
import {
  canUseTemplate,
  filterTemplates,
  contrastRatio,
  readableOn,
  resolvePalette,
  TEMPLATE_LIST,
  TEMPLATE_SECTORS,
  templatesFor,
  templatesForStore,
} from './templates/index.js';

describe('Templates et palettes', () => {
  it('chaque template propose entre 5 et 10 palettes, aux identifiants uniques', () => {
    for (const { manifest } of TEMPLATE_LIST) {
      expect(manifest.palettes.length, manifest.id).toBeGreaterThanOrEqual(5);
      expect(manifest.palettes.length, manifest.id).toBeLessThanOrEqual(10);
      expect(new Set(manifest.palettes.map((p) => p.id)).size, manifest.id).toBe(manifest.palettes.length);
    }
  });

  // Une palette ne peut pas rendre le site illisible : tout texte atteint le niveau WCAG AA.
  describe.each(TEMPLATE_LIST.flatMap(({ manifest }) => manifest.palettes.map((p) => [`${manifest.id}/${p.id}`, p] as const)))(
    'palette %s',
    (_name, palette) => {
      const c = palette.colors;
      it('texte principal et secondaire lisibles sur le fond', () => {
        expect(contrastRatio(c.foreground, c.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(c.muted, c.background)).toBeGreaterThanOrEqual(4.5);
      });
      it('texte lisible sur les panneaux', () => {
        expect(contrastRatio(c.surfaceForeground, c.surface)).toBeGreaterThanOrEqual(4.5);
      });
      it('libellés lisibles sur l’action et la mise en avant', () => {
        expect(contrastRatio(c.primary, readableOn(c.primary))).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(c.accent, readableOn(c.accent))).toBeGreaterThanOrEqual(4.5);
      });
    },
  );

  it('le cahier écrit à l’encre du stylo : l’accent se lit sur le papier', () => {
    const atelier = TEMPLATE_LIST.find((t) => t.manifest.id === 'atelier')!;
    for (const palette of atelier.manifest.palettes) {
      expect(contrastRatio(palette.colors.accent, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('la vitrine écrit l’état en couleur d’accent sur le comptoir', () => {
    const vitrine = TEMPLATE_LIST.find((t) => t.manifest.id === 'vitrine')!;
    for (const palette of vitrine.manifest.palettes) {
      expect(contrastRatio(palette.colors.accent, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('le patron trace le choix en cours au rouge : lisible sur l’enveloppe et sur le papier', () => {
    const patron = TEMPLATE_LIST.find((t) => t.manifest.id === 'patron')!;
    for (const palette of patron.manifest.palettes) {
      expect(contrastRatio(palette.colors.primary, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.colors.primary, palette.colors.surface), palette.id).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.colors.accent, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('la boîte écrit les prix dans la couleur d’action, sur le carton comme sur l’étiquette', () => {
    const boite = TEMPLATE_LIST.find((t) => t.manifest.id === 'boite')!;
    for (const palette of boite.manifest.palettes) {
      expect(contrastRatio(palette.colors.primary, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.colors.primary, palette.colors.surface), palette.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('la couverture imprime le choix en cours et pose sa pastille sur l’aplat de une', () => {
    const couverture = TEMPLATE_LIST.find((t) => t.manifest.id === 'couverture')!;
    for (const palette of couverture.manifest.palettes) {
      // La taille choisie s'imprime dans la couleur d'action : elle se détache du papier.
      expect(contrastRatio(palette.colors.primary, palette.colors.background), palette.id).toBeGreaterThanOrEqual(3);
      // Pastille « Nouveauté » (surface) posée sur la couleur de une.
      expect(contrastRatio(palette.colors.surface, palette.colors.accent), palette.id).toBeGreaterThanOrEqual(1.6);
    }
  });

  it('l’enseigne allume ses prix dans la couleur des LED, lisibles sur le fond de la boutique', () => {
    const enseigne = TEMPLATE_LIST.find((t) => t.manifest.id === 'enseigne')!;
    for (const palette of enseigne.manifest.palettes) {
      expect(contrastRatio(palette.colors.primary, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.colors.accent, palette.colors.background), palette.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('les réglages par défaut de chaque template passent son propre schéma', () => {
    for (const template of TEMPLATE_LIST) {
      expect(template.settingsSchema.safeParse(template.defaultSettings).success, template.manifest.id).toBe(true);
    }
  });

  it('refuse une palette d’un autre template', () => {
    const atelier = TEMPLATE_LIST.find((t) => t.manifest.id === 'atelier')!;
    const result = atelier.settingsSchema.safeParse({ ...atelier.defaultSettings, palette: 'comptoir-nuit' });
    expect(result.success).toBe(false);
  });

  it('propose d’abord les templates du type de boutique', () => {
    expect(templatesFor('FASHION').recommended.map((t) => t.manifest.id)).toEqual(['default', 'atelier', 'patron', 'couverture', 'devanture']);
    expect(templatesFor('ELECTRONICS').recommended.map((t) => t.manifest.id)).toEqual(['default', 'vitrine', 'boite', 'enseigne', 'devanture']);
  });

  it('ne propose à une boutique que les modèles de son type', () => {
    expect(templatesForStore('ELECTRONICS').map((t) => t.manifest.id)).toEqual(['default', 'vitrine', 'boite', 'enseigne', 'devanture']);
    expect(templatesForStore('FASHION').map((t) => t.manifest.id)).toEqual(['default', 'atelier', 'patron', 'couverture', 'devanture']);
  });

  it('classe chaque modèle dans les secteurs de ses types et dans des styles connus', () => {
    for (const { manifest } of TEMPLATE_LIST) {
      const allowed = manifest.storeTypes.flatMap((type) => TEMPLATE_SECTORS[type].map((s) => s.id as string));
      expect(manifest.sectors.length, manifest.id).toBeGreaterThan(0);
      for (const sector of manifest.sectors) expect(allowed, `${manifest.id} ${sector}`).toContain(sector);
      expect(manifest.styles.length, manifest.id).toBeGreaterThan(0);
      expect(manifest.addedAt, manifest.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('cherche sans accents ni casse, et combine les filtres', () => {
    const tech = templatesForStore('ELECTRONICS');
    expect(filterTemplates(tech, { q: 'LUMINEUX' }).map((t) => t.manifest.id)).toEqual(['vitrine', 'enseigne']);
    expect(filterTemplates(tech, { style: 'epure', tier: 'premium' }).map((t) => t.manifest.id)).toEqual(['vitrine', 'boite']);
    expect(filterTemplates(tech, { sector: 'gaming' }).map((t) => t.manifest.id)).toEqual(['default', 'enseigne']);
    expect(filterTemplates(tech, { q: 'épuré télé' }).length).toBeGreaterThan(0);
  });

  it('ne laisse que le modèle natif gratuit', () => {
    expect(TEMPLATE_LIST.filter((t) => t.manifest.tier === 'free').map((t) => t.manifest.id)).toEqual(['default']);
    const enseigne = TEMPLATE_LIST.find((t) => t.manifest.id === 'enseigne')!;
    expect(canUseTemplate('FREE', enseigne.manifest)).toBe(false);
    expect(canUseTemplate('PREMIUM', enseigne.manifest)).toBe(true);
    expect(canUseTemplate('FREE', TEMPLATE_LIST[0]!.manifest)).toBe(true);
  });

  it('retombe sur la première palette si la palette est inconnue ou vide', () => {
    expect(resolvePalette({ template: 'vitrine', palette: '' }).id).toBe('comptoir-nuit');
    expect(resolvePalette({ template: 'inconnu', palette: 'x' }).id).toBe('upsell');
  });
});
