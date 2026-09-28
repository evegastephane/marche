import type { CampaignDto } from '@marche/contracts';
import type { MessageStatus } from '../domain/whatsapp.js';

/** Message modèle (« template ») approuvé chez Meta, avec ses paramètres. */
export interface TemplateMessage {
  /** Numéro international sans « + ». */
  to: string;
  /** Paramètres du corps, dans l'ordre {{1}}, {{2}}… */
  bodyParams: string[];
  /** Image d'en-tête (URL publique en https), si le modèle en a une. */
  headerImageUrl?: string | null;
}

export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    /** Vrai si réessayer a une chance d'aboutir (réseau, limite de débit, panne de Meta). */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'WhatsAppSendError';
  }
}

/** Envoi par l'API WhatsApp Cloud (adapter : infrastructure/whatsapp-cloud.sender.ts). */
export abstract class WhatsAppSender {
  /** Jeton, numéro et modèle renseignés dans la configuration. */
  abstract readonly configured: boolean;
  abstract readonly templateName: string | null;
  /** Le modèle a-t-il une image d'en-tête à remplir ? */
  abstract readonly usesHeaderImage: boolean;
  /** Lève WhatsAppSendError en cas d'échec. */
  abstract sendTemplate(message: TemplateMessage): Promise<{ providerMessageId: string }>;
}

export interface CampaignRecipient {
  customerId: string;
  firstName: string | null;
  phone: string;
}

export interface NewCampaign {
  id: string;
  productId: string;
  productTitle: string;
  templateName: string;
  createdByUserId: string | null;
  recipients: CampaignRecipient[];
}

export interface PendingMessage {
  id: string;
  phone: string;
  firstName: string | null;
}

export abstract class CampaignRepository {
  abstract create(campaign: NewCampaign): Promise<void>;
  abstract list(limit: number): Promise<CampaignDto[]>;
  abstract get(id: string): Promise<CampaignDto | null>;
  abstract productOf(campaignId: string): Promise<string | null>;
  abstract pendingMessages(campaignId: string): Promise<PendingMessage[]>;
  abstract markSent(messageId: string, providerMessageId: string, at: Date): Promise<void>;
  abstract markFailed(messageId: string, error: string): Promise<void>;
  abstract finish(campaignId: string, at: Date): Promise<void>;
  /** Notification de Meta (contexte système) : fait avancer le statut du message identifié par Meta. */
  abstract applyStatus(providerMessageId: string, status: MessageStatus, at: Date, error?: string): Promise<void>;
}
