import { z } from 'zod';
import type { ThemeSettings } from './templates/theme.js';

export const SITE_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export const generateSiteSchema = z.object({
  templateId: z.string().trim().min(1).max(40).default('default'),
});
export type GenerateSiteInput = z.infer<typeof generateSiteSchema>;

/** Les réglages sont validés côté API par le schéma du template du site. */
export const updateDraftThemeSchema = z.object({
  settings: z.unknown(),
});
export type UpdateDraftThemeInput = z.infer<typeof updateDraftThemeSchema>;

/** Réglages en cours d'édition, montrés en direct dans l'aperçu du dashboard (jamais enregistrés). */
export const previewThemeSchema = z.object({
  session: z.uuid(),
  settings: z.unknown(),
});
export type PreviewThemeInput = z.infer<typeof previewThemeSchema>;

export interface SiteDto {
  id: string;
  subdomain: string;
  url: string;
  templateId: string;
  templateVersion: string;
  status: SiteStatus;
  themeSettings: ThemeSettings;
  draftThemeSettings: ThemeSettings;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewTokenDto {
  token: string;
  expiresAt: string;
  /** Aperçu dans un nouvel onglet. */
  previewUrl: string;
  /** Aperçu intégré à l'éditeur du dashboard (iframe). */
  embedUrl: string;
  /** Session d'aperçu : les réglages non enregistrés envoyés par l'éditeur s'y rattachent. */
  session: string;
}
