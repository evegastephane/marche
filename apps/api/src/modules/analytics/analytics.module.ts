import { Injectable, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import type { SerializedDomainEvent } from '../../shared/domain/domain-event.js';
import { APP_CONFIG, type AppConfig } from '../../shared/infrastructure/config/app-config.js';
import { OnDomainEvent } from '../../shared/infrastructure/queue/on-domain-event.decorator.js';

export interface AnalyticsEvent {
  /** Identifiant de l'événement de domaine : PostHog déduplique les envois rejoués. */
  uuid: string;
  distinctId: string;
  event: string;
  properties: Record<string, unknown>;
  groups: Record<string, string>;
  timestamp: Date;
}

/** Port d'analytics produit (PostHog), côté serveur. */
export abstract class AnalyticsPort {
  abstract capture(event: AnalyticsEvent): Promise<void>;
  abstract shutdown(): Promise<void>;
}

class PostHogAnalytics extends AnalyticsPort {
  private readonly client: PostHog;

  constructor(apiKey: string, host: string) {
    super();
    this.client = new PostHog(apiKey, { host, flushAt: 20, flushInterval: 5_000 });
  }

  async capture(event: AnalyticsEvent): Promise<void> {
    this.client.capture({
      uuid: event.uuid,
      distinctId: event.distinctId,
      event: event.event,
      properties: event.properties,
      groups: event.groups,
      timestamp: event.timestamp,
    });
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown(5_000);
  }
}

class NoopAnalytics extends AnalyticsPort {
  async capture(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

/** Événements de domaine → événements produit PostHog (docs/ARCHITECTURE.md §6). */
const TRACKED: Record<string, { name: string; properties: (payload: Record<string, unknown>) => Record<string, unknown> }> = {
  'stores.store.created': { name: 'store_created', properties: (p) => ({ currency: p.currency, country: p.country }) },
  'catalog.product.created': { name: 'product_created', properties: () => ({}) },
  'catalog.product.published': { name: 'product_published', properties: () => ({}) },
  'orders.order.placed': {
    name: 'order_placed',
    properties: (p) => ({ total_amount: p.totalAmount, currency: p.currency, source: p.source, items_count: p.itemsCount }),
  },
  'orders.order.fulfilled': { name: 'order_fulfilled', properties: () => ({}) },
  'sites.site.published': { name: 'site_published', properties: (p) => ({ first_publication: p.firstPublication }) },
};

@Injectable()
export class AnalyticsEventHandlers {
  private readonly logger = new Logger(AnalyticsEventHandlers.name);

  constructor(private readonly analytics: AnalyticsPort) {}

  @OnDomainEvent({ event: 'stores.store.created', queue: 'analytics', name: 'store_created' })
  onStoreCreated(event: SerializedDomainEvent) {
    return this.track(event);
  }

  @OnDomainEvent({ event: 'catalog.product.created', queue: 'analytics', name: 'product_created' })
  onProductCreated(event: SerializedDomainEvent) {
    return this.track(event);
  }

  @OnDomainEvent({ event: 'catalog.product.published', queue: 'analytics', name: 'product_published' })
  onProductPublished(event: SerializedDomainEvent) {
    return this.track(event);
  }

  @OnDomainEvent({ event: 'orders.order.placed', queue: 'analytics', name: 'order_placed' })
  onOrderPlaced(event: SerializedDomainEvent) {
    return this.track(event);
  }

  @OnDomainEvent({ event: 'orders.order.fulfilled', queue: 'analytics', name: 'order_fulfilled' })
  onOrderFulfilled(event: SerializedDomainEvent) {
    return this.track(event);
  }

  @OnDomainEvent({ event: 'sites.site.published', queue: 'analytics', name: 'site_published' })
  onSitePublished(event: SerializedDomainEvent) {
    return this.track(event);
  }

  private async track(event: SerializedDomainEvent): Promise<void> {
    const tracked = TRACKED[event.type];
    if (!tracked) return;
    await this.analytics.capture({
      uuid: event.id,
      // Événements « boutique » : la boutique est l'acteur, et le groupe PostHog « store ».
      distinctId: `store_${event.storeId}`,
      event: tracked.name,
      properties: { ...tracked.properties((event.payload ?? {}) as Record<string, unknown>), store_id: event.storeId },
      groups: { store: event.storeId },
      timestamp: new Date(event.occurredAt),
    });
    this.logger.debug(`PostHog : ${tracked.name}`);
  }
}

@Injectable()
class AnalyticsShutdown implements OnApplicationShutdown {
  constructor(private readonly analytics: AnalyticsPort) {}

  async onApplicationShutdown(): Promise<void> {
    await this.analytics.shutdown();
  }
}

@Module({
  providers: [
    {
      provide: AnalyticsPort,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): AnalyticsPort =>
        config.posthog.apiKey ? new PostHogAnalytics(config.posthog.apiKey, config.posthog.host) : new NoopAnalytics(),
    },
    AnalyticsEventHandlers,
    AnalyticsShutdown,
  ],
  exports: [AnalyticsPort],
})
export class AnalyticsModule {}

