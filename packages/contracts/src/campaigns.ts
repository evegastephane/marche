import { z } from 'zod';

export const CAMPAIGN_STATUSES = ['SENDING', 'DONE'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_MESSAGE_STATUSES = ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
export type CampaignMessageStatus = (typeof CAMPAIGN_MESSAGE_STATUSES)[number];

/** Lancer une campagne WhatsApp : un produit en vente, envoyé aux clients qui ont accepté les nouveautés. */
export const launchCampaignSchema = z.object({
  productId: z.uuid(),
});
export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;

export interface CampaignCountsDto {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface CampaignDto {
  id: string;
  productId: string | null;
  productTitle: string;
  status: CampaignStatus;
  counts: CampaignCountsDto;
  createdAt: string;
  finishedAt: string | null;
}

/** Qui recevrait une campagne maintenant, et si l'envoi est possible. */
export interface WhatsAppAudienceDto {
  /** Numéro WhatsApp et modèle configurés côté plateforme. */
  configured: boolean;
  /** Clients qui ont accepté, sans désinscription, avec un numéro. */
  recipients: number;
  /** Nom du modèle de message approuvé chez Meta. */
  templateName: string | null;
}
