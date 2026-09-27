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
  previewUrl: string;
}
