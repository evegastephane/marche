import { Injectable } from '@nestjs/common';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import { OnDomainEvent } from '../../../shared/infrastructure/queue/on-domain-event.decorator.js';
import { CAMPAIGN_LAUNCHED, CampaignUseCases } from '../application/campaign.use-cases.js';

/** Abonnés du module campaigns (worker, file « campaigns »). */
@Injectable()
export class CampaignsEventHandlers {
  constructor(private readonly campaigns: CampaignUseCases) {}

  @OnDomainEvent({ event: CAMPAIGN_LAUNCHED, queue: 'campaigns', name: 'send-campaign' })
  onCampaignLaunched(event: SerializedDomainEvent): Promise<void> {
    return this.campaigns.send(event.aggregateId);
  }
}
