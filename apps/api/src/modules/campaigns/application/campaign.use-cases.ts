import { Injectable, Logger } from '@nestjs/common';
import type { CampaignDto, LaunchCampaignInput, WhatsAppAudienceDto } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { PublicUrls } from '../../../shared/application/public-urls.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/domain-error.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { newId } from '../../../shared/domain/id.js';
import { Money } from '../../../shared/domain/money.vo.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { OrdersFacade } from '../../orders/orders.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { isOptOutMessage, type MessageStatus, phoneSuffix, toWhatsAppNumber } from '../domain/whatsapp.js';
import {
  type CampaignRecipient,
  CampaignRepository,
  WhatsAppSendError,
  WhatsAppSender,
} from './campaigns.ports.js';

export const CAMPAIGN_LAUNCHED = 'campaigns.campaign.launched';

/** Charge utile des notifications WhatsApp de Meta (seuls les champs utilisés). */
export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        statuses?: { id?: string; status?: string; timestamp?: string; errors?: { title?: string; message?: string }[] }[];
        messages?: { from?: string; type?: string; text?: { body?: string }; button?: { text?: string } }[];
      };
    }[];
  }[];
}

const META_STATUSES: Record<string, MessageStatus> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

/**
 * Campagnes WhatsApp : un produit en vente, envoyé aux clients qui ont coché
 * « Recevoir les nouveautés sur WhatsApp » au paiement et ne se sont pas désinscrits.
 * Le lancement enregistre la campagne et ses destinataires ; l'envoi se fait dans le worker.
 */
@Injectable()
export class CampaignUseCases {
  private readonly logger = new Logger(CampaignUseCases.name);

  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly sender: WhatsAppSender,
    private readonly catalog: CatalogFacade,
    private readonly orders: OrdersFacade,
    private readonly stores: StoresFacade,
    private readonly urls: PublicUrls,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  /** Destinataires joignables, au format WhatsApp, sans doublon de numéro. */
  private async recipients(): Promise<CampaignRecipient[]> {
    const settings = await this.stores.getSettings(this.actor.storeId);
    const seen = new Set<string>();
    const result: CampaignRecipient[] = [];
    for (const customer of await this.orders.listWhatsAppRecipients()) {
      const phone = toWhatsAppNumber(customer.phone, settings.country);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      result.push({ customerId: customer.customerId, firstName: customer.firstName, phone });
    }
    return result;
  }

  async audience(): Promise<WhatsAppAudienceDto> {
    return {
      configured: this.sender.configured,
      recipients: (await this.recipients()).length,
      templateName: this.sender.templateName,
    };
  }

  list(): Promise<CampaignDto[]> {
    return this.campaigns.list(50);
  }

  async launch(input: LaunchCampaignInput): Promise<CampaignDto> {
    if (!this.sender.configured || !this.sender.templateName) {
      throw new ConflictError(
        'WHATSAPP_NOT_CONFIGURED',
        'L’envoi WhatsApp n’est pas configuré : jeton, numéro et modèle de message sont à renseigner.',
      );
    }
    const product = await this.catalog.getProduct(input.productId);
    if (!product) throw new NotFoundError('Produit', input.productId);
    if (product.status !== 'ACTIVE') {
      throw new ConflictError('PRODUCT_NOT_ACTIVE', 'Mettez ce produit en vente avant de l’envoyer à vos clients.');
    }
    const recipients = await this.recipients();
    if (recipients.length === 0) {
      throw new ConflictError(
        'NO_RECIPIENTS',
        'Aucun client n’a encore accepté de recevoir vos nouveautés sur WhatsApp.',
      );
    }
    const id = newId();
    await this.uow.run(async () => {
      await this.campaigns.create({
        id,
        productId: product.id,
        productTitle: product.title,
        templateName: this.sender.templateName as string,
        createdByUserId: this.actor.userId,
        recipients,
      });
      await this.outbox.addAll([createEvent(CAMPAIGN_LAUNCHED, this.actor.storeId, id, { recipients: recipients.length })]);
    });
    const campaign = await this.campaigns.get(id);
    if (!campaign) throw new NotFoundError('Campagne', id);
    return campaign;
  }

  /**
   * Worker : envoie les messages encore en file. Idempotent : un message déjà parti n'est pas renvoyé.
   * Une erreur passagère (réseau, débit) relance le job ; une erreur définitive marque le message en échec.
   */
  async send(campaignId: string): Promise<void> {
    const settings = await this.stores.getSettings(this.actor.storeId);
    const productId = await this.campaigns.productOf(campaignId);
    const product = productId ? await this.catalog.getProduct(productId) : null;
    const pending = await this.campaigns.pendingMessages(campaignId);

    if (!product) {
      for (const message of pending) await this.campaigns.markFailed(message.id, 'Produit supprimé avant l’envoi');
    } else if (pending.length > 0) {
      const prices = product.variants.filter((v) => !v.archived).map((v) => v.priceAmount);
      const price = Money.of(prices.length ? Math.min(...prices) : 0, settings.currency).format();
      const url = `${this.urls.site(settings.slug)}/products/${product.slug}`;
      const cover = product.media[0];
      const image = this.sender.usesHeaderImage && cover ? (cover.renditions['800'] ?? cover.url) : null;
      for (const message of pending) {
        try {
          const { providerMessageId } = await this.sender.sendTemplate({
            to: message.phone,
            bodyParams: [message.firstName?.trim() || 'à vous', settings.name, product.title, price, url],
            headerImageUrl: image,
          });
          await this.campaigns.markSent(message.id, providerMessageId, this.clock.now());
        } catch (error) {
          if (error instanceof WhatsAppSendError && error.retryable) throw error;
          await this.campaigns.markFailed(message.id, error instanceof Error ? error.message : String(error));
        }
      }
    }
    await this.campaigns.finish(campaignId, this.clock.now());
  }

  /**
   * Notifications de Meta (contexte système) : statuts des messages (délivré, lu, échec)
   * et réponses « STOP », qui désinscrivent le numéro dans toutes les boutiques.
   */
  async handleWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    for (const change of (payload.entry ?? []).flatMap((entry) => entry.changes ?? [])) {
      for (const status of change.value?.statuses ?? []) {
        const next = status.status ? META_STATUSES[status.status] : undefined;
        if (!status.id || !next) continue;
        const at = status.timestamp ? new Date(Number(status.timestamp) * 1000) : this.clock.now();
        const error = status.errors?.[0];
        await this.campaigns.applyStatus(status.id, next, at, error ? (error.message ?? error.title) : undefined);
      }
      for (const message of change.value?.messages ?? []) {
        const text = message.text?.body ?? message.button?.text ?? '';
        if (!message.from || !isOptOutMessage(text)) continue;
        const count = await this.orders.optOutWhatsApp(phoneSuffix(message.from), this.clock.now());
        this.logger.log(`Désinscription WhatsApp reçue : ${count} fiche(s) client mise(s) à jour`);
      }
    }
  }
}
