import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { OutboxPort } from '../../application/outbox.port.js';
import type { DomainEvent } from '../../domain/domain-event.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaAdapter } from '../prisma/transaction.js';

/** Écrit les événements dans `outbox_events`, dans la transaction courante. */
@Injectable()
export class PrismaOutboxRepository extends OutboxPort {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async addAll(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.txHost.tx.outboxEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        storeId: event.storeId,
        type: event.type,
        aggregateId: event.aggregateId,
        // Aller-retour JSON : les dates deviennent des chaînes ISO, comme dans le job BullMQ.
        payload: JSON.parse(JSON.stringify(event.payload ?? null)) as Prisma.InputJsonValue,
        occurredAt: event.occurredAt,
      })),
    });
  }
}
