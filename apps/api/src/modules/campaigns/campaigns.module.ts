import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CampaignUseCases } from './application/campaign.use-cases.js';
import { CampaignRepository, WhatsAppSender } from './application/campaigns.ports.js';
import { PrismaCampaignRepository } from './infrastructure/prisma-campaign.repository.js';
import { WhatsAppCloudSender } from './infrastructure/whatsapp-cloud.sender.js';
import { CampaignsController } from './interface/campaigns.controller.js';
import { CampaignsEventHandlers } from './interface/campaigns.event-handlers.js';
import { WhatsAppWebhooksController } from './interface/whatsapp-webhooks.controller.js';

/** Campagnes WhatsApp : lancement (API), envoi (worker), statuts et « STOP » (webhook Meta). */
@Module({
  imports: [StoresModule, OrdersModule, CatalogModule],
  controllers: [CampaignsController, WhatsAppWebhooksController],
  providers: [
    { provide: CampaignRepository, useClass: PrismaCampaignRepository },
    { provide: WhatsAppSender, useClass: WhatsAppCloudSender },
    CampaignUseCases,
    CampaignsEventHandlers,
  ],
})
export class CampaignsModule {}
