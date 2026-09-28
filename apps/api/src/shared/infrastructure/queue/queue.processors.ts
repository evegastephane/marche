import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import type { SerializedDomainEvent } from '../../domain/domain-event.js';
import { TenantContext } from '../cls/tenant-context.js';
import { OutboxRelay } from '../outbox/outbox-relay.js';
import { DomainEventHandlerRegistry } from './domain-event-handler.registry.js';
import type { EventQueueName } from './queues.js';

/**
 * Squelette commun des processeurs de files (Template Method) :
 * trouve l'abonné du job, ouvre le contexte de la boutique, exécute, journalise.
 */
@Injectable()
export abstract class DomainEventProcessor extends WorkerHost {
  protected abstract readonly queueName: EventQueueName;
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly registry: DomainEventHandlerRegistry,
    private readonly tenant: TenantContext,
  ) {
    super();
  }

  async process(job: Job<SerializedDomainEvent>): Promise<unknown> {
    const handler = this.registry.handlerFor(this.queueName, job.name);
    if (!handler) {
      throw new Error(`Aucun abonné pour le job ${this.queueName}/${job.name}`);
    }
    const event = job.data;
    const run = () => handler(event);
    try {
      return await (event.storeId
        ? this.tenant.runForStore(event.storeId, run)
        : this.tenant.runAsSystem(run));
    } catch (error) {
      this.logger.warn(
        `Échec ${this.queueName}/${job.name} (tentative ${job.attemptsMade + 1}) pour ${event.type} ${event.aggregateId} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}

@Processor('notifications', { concurrency: 5 })
export class NotificationsProcessor extends DomainEventProcessor {
  protected readonly queueName = 'notifications' as const;
}

@Processor('site-publishing', { concurrency: 5 })
export class SitePublishingProcessor extends DomainEventProcessor {
  protected readonly queueName = 'site-publishing' as const;
}

@Processor('media', { concurrency: 2 })
export class MediaProcessor extends DomainEventProcessor {
  protected readonly queueName = 'media' as const;
}

@Processor('inventory-alerts', { concurrency: 5 })
export class InventoryAlertsProcessor extends DomainEventProcessor {
  protected readonly queueName = 'inventory-alerts' as const;
}

@Processor('analytics', { concurrency: 10 })
export class AnalyticsProcessor extends DomainEventProcessor {
  protected readonly queueName = 'analytics' as const;
}

/** Envois des campagnes WhatsApp : un job par campagne, les messages partent l'un après l'autre. */
@Processor('campaigns', { concurrency: 2 })
export class CampaignsProcessor extends DomainEventProcessor {
  protected readonly queueName = 'campaigns' as const;
}

/** Relais de l'outbox, déclenché chaque seconde par un job scheduler BullMQ. */
@Processor('outbox-relay', { concurrency: 1 })
export class OutboxRelayProcessor extends WorkerHost implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelay,
    @InjectQueue('outbox-relay') private readonly queue: Queue,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'outbox-relay',
      { every: 1_000 },
      { name: 'relay', opts: { removeOnComplete: true, removeOnFail: 100, attempts: 1 } },
    );
  }

  async process(): Promise<number> {
    return this.relay.relayPending();
  }
}
