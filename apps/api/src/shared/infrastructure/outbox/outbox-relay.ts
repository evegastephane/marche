import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { Queue } from 'bullmq';
import type { SerializedDomainEvent } from '../../domain/domain-event.js';
import { TenantContext } from '../cls/tenant-context.js';
import type { PrismaAdapter } from '../prisma/transaction.js';
import { DomainEventHandlerRegistry } from '../queue/domain-event-handler.registry.js';
import { EVENT_QUEUE_NAMES, type EventQueueName } from '../queue/queues.js';

interface OutboxRow {
  id: string;
  store_id: string | null;
  type: string;
  aggregate_id: string;
  payload: unknown;
  occurred_at: Date;
}

const BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 20;

/** Identifiant de job déterministe : un ré-envoi ne crée pas de doublon (BullMQ refuse « : »). */
export function jobIdFor(eventId: string, jobName: string): string {
  return `${eventId}__${jobName}`.replace(/:/g, '-');
}

/**
 * Relais de l'outbox (docs/PLAN-CODE.md §6.5) : lit les événements non publiés
 * (FOR UPDATE SKIP LOCKED, sûr avec plusieurs workers), crée un job par abonné,
 * puis marque les événements publiés.
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);
  private queues?: Map<EventQueueName, Queue>;

  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly tenant: TenantContext,
    private readonly registry: DomainEventHandlerRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Publie tout ce qui est en attente (borné) et retourne le nombre d'événements traités. */
  async relayPending(): Promise<number> {
    let total = 0;
    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
      const count = await this.relayBatch();
      total += count;
      if (count < BATCH_SIZE) break;
    }
    return total;
  }

  async relayBatch(): Promise<number> {
    return this.tenant.runAsSystem(() =>
      this.txHost.withTransaction(async () => {
        const rows = await this.txHost.tx.$queryRaw<OutboxRow[]>`
          SELECT id, store_id, type, aggregate_id, payload, occurred_at
          FROM outbox_events
          WHERE published_at IS NULL
          ORDER BY occurred_at
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED`;
        if (rows.length === 0) return 0;

        const jobsByQueue = new Map<EventQueueName, Parameters<Queue['addBulk']>[0]>();
        for (const row of rows) {
          const event: SerializedDomainEvent = {
            id: row.id,
            type: row.type,
            storeId: row.store_id ?? '',
            aggregateId: row.aggregate_id,
            occurredAt: row.occurred_at.toISOString(),
            payload: row.payload,
          };
          for (const route of this.registry.routesFor(row.type)) {
            const jobs = jobsByQueue.get(route.queue) ?? [];
            jobs.push({
              name: route.name,
              data: event,
              opts: {
                jobId: jobIdFor(event.id, route.name),
                ...(route.attempts ? { attempts: route.attempts } : {}),
              },
            });
            jobsByQueue.set(route.queue, jobs);
          }
        }

        for (const [queueName, jobs] of jobsByQueue) {
          await this.queue(queueName).addBulk(jobs);
        }

        const ids = rows.map((row) => row.id);
        await this.txHost.tx.outboxEvent.updateMany({
          where: { id: { in: ids } },
          data: { publishedAt: new Date(), attempts: { increment: 1 } },
        });
        this.logger.debug(`${rows.length} événements publiés`);
        return rows.length;
      }),
    );
  }

  private queue(name: EventQueueName): Queue {
    if (!this.queues) {
      this.queues = new Map(
        EVENT_QUEUE_NAMES.map((queueName) => [
          queueName,
          this.moduleRef.get<Queue>(getQueueToken(queueName), { strict: false }),
        ]),
      );
    }
    const queue = this.queues.get(name);
    if (!queue) throw new Error(`File inconnue : ${name}`);
    return queue;
  }
}
