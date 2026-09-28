import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import { type TemplateMessage, WhatsAppSendError, WhatsAppSender } from '../application/campaigns.ports.js';

interface GraphResponse {
  messages?: { id?: string }[];
  error?: { message?: string; code?: number };
}

/** Codes Meta de limite de débit : réessayer plus tard a des chances d'aboutir. */
const RATE_LIMIT_CODES = new Set([4, 80007, 130429, 131048, 131056]);

/**
 * Adapter de l'API WhatsApp Cloud (Graph API de Meta) : envoi d'un message modèle.
 * https://graph.facebook.com/{version}/{phone-number-id}/messages
 */
@Injectable()
export class WhatsAppCloudSender extends WhatsAppSender {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  get configured(): boolean {
    const w = this.config.whatsapp;
    return Boolean(w.accessToken && w.phoneNumberId && w.templateName);
  }

  get templateName(): string | null {
    return this.config.whatsapp.templateName ?? null;
  }

  get usesHeaderImage(): boolean {
    return this.config.whatsapp.templateHeaderImage;
  }

  async sendTemplate(message: TemplateMessage): Promise<{ providerMessageId: string }> {
    const w = this.config.whatsapp;
    if (!this.configured) throw new WhatsAppSendError('Envoi WhatsApp non configuré', false);
    const components: unknown[] = [];
    if (w.templateHeaderImage && message.headerImageUrl) {
      components.push({ type: 'header', parameters: [{ type: 'image', image: { link: message.headerImageUrl } }] });
    }
    components.push({ type: 'body', parameters: message.bodyParams.map((text) => ({ type: 'text', text })) });

    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${w.apiVersion}/${w.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${w.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'template',
          template: { name: w.templateName, language: { code: w.templateLanguage }, components },
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new WhatsAppSendError('WhatsApp injoignable (réseau ou délai dépassé)', true);
    }
    const body = (await response.json().catch(() => null)) as GraphResponse | null;
    if (!response.ok) {
      const code = body?.error?.code;
      const retryable = response.status >= 500 || response.status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code));
      throw new WhatsAppSendError(body?.error?.message ?? `Refus de WhatsApp (HTTP ${response.status})`, retryable);
    }
    const id = body?.messages?.[0]?.id;
    if (!id) throw new WhatsAppSendError('Réponse de WhatsApp sans identifiant de message', false);
    return { providerMessageId: id };
  }
}
