import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { OutboxRelay } from '../outbox/outbox-relay.js';
import { DomainEventHandlerRegistry } from './domain-event-handler.registry.js';
import {
  AnalyticsProcessor,
  InventoryAlertsProcessor,
  MediaProcessor,
  NotificationsProcessor,
  OutboxRelayProcessor,
  SitePublishingProcessor,
} from './queue.processors.js';

/** Côté worker uniquement : registre des abonnés, relais de l'outbox et consommateurs des files. */
@Module({
  imports: [DiscoveryModule],
  providers: [
    DomainEventHandlerRegistry,
    OutboxRelay,
    OutboxRelayProcessor,
    NotificationsProcessor,
    SitePublishingProcessor,
    MediaProcessor,
    InventoryAlertsProcessor,
    AnalyticsProcessor,
  ],
  exports: [DomainEventHandlerRegistry, OutboxRelay],
})
export class QueueWorkersModule {}
