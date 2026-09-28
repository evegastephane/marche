import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { CampaignCountsDto, CampaignDto } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { CampaignRepository, type NewCampaign, type PendingMessage } from '../application/campaigns.ports.js';
import { type MessageStatus, nextStatus } from '../domain/whatsapp.js';

interface CampaignRow {
  id: string;
  productId: string | null;
  productTitle: string;
  status: 'SENDING' | 'DONE';
  createdAt: Date;
  finishedAt: Date | null;
}

const emptyCounts = (): CampaignCountsDto => ({ total: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 });

@Injectable()
export class PrismaCampaignRepository extends CampaignRepository {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly actor: ActorContext,
  ) {
    super();
  }

  async create(campaign: NewCampaign): Promise<void> {
    const storeId = this.actor.storeId;
    await this.txHost.tx.campaign.create({
      data: {
        id: campaign.id,
        storeId,
        productId: campaign.productId,
        productTitle: campaign.productTitle,
        templateName: campaign.templateName,
        createdByUserId: campaign.createdByUserId,
      },
    });
    await this.txHost.tx.campaignMessage.createMany({
      data: campaign.recipients.map((r) => ({
        storeId,
        campaignId: campaign.id,
        customerId: r.customerId,
        phone: r.phone,
        firstName: r.firstName,
      })),
    });
  }

  async list(limit: number): Promise<CampaignDto[]> {
    const rows = await this.txHost.tx.campaign.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return this.withCounts(rows);
  }

  async get(id: string): Promise<CampaignDto | null> {
    const row = await this.txHost.tx.campaign.findFirst({ where: { id } });
    return row ? ((await this.withCounts([row]))[0] ?? null) : null;
  }

  async productOf(campaignId: string): Promise<string | null> {
    const row = await this.txHost.tx.campaign.findFirst({ where: { id: campaignId }, select: { productId: true } });
    return row?.productId ?? null;
  }

  async pendingMessages(campaignId: string): Promise<PendingMessage[]> {
    return this.txHost.tx.campaignMessage.findMany({
      where: { campaignId, status: 'QUEUED' },
      select: { id: true, phone: true, firstName: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markSent(messageId: string, providerMessageId: string, at: Date): Promise<void> {
    await this.txHost.tx.campaignMessage.updateMany({
      where: { id: messageId, status: 'QUEUED' },
      data: { status: 'SENT', providerMessageId, sentAt: at },
    });
  }

  async markFailed(messageId: string, error: string): Promise<void> {
    await this.txHost.tx.campaignMessage.updateMany({
      where: { id: messageId, status: 'QUEUED' },
      data: { status: 'FAILED', error: error.slice(0, 500) },
    });
  }

  async finish(campaignId: string, at: Date): Promise<void> {
    await this.txHost.tx.campaign.updateMany({ where: { id: campaignId }, data: { status: 'DONE', finishedAt: at } });
  }

  async applyStatus(providerMessageId: string, status: MessageStatus, at: Date, error?: string): Promise<void> {
    const message = await this.txHost.tx.campaignMessage.findFirst({
      where: { providerMessageId },
      select: { id: true, status: true, deliveredAt: true },
    });
    if (!message) return;
    const next = nextStatus(message.status, status);
    if (next === message.status) return;
    await this.txHost.tx.campaignMessage.updateMany({
      where: { id: message.id },
      data: {
        status: next,
        ...(next === 'DELIVERED' && { deliveredAt: at }),
        ...(next === 'READ' && { readAt: at, deliveredAt: message.deliveredAt ?? at }),
        ...(next === 'FAILED' && { error: error?.slice(0, 500) ?? 'Échec signalé par WhatsApp' }),
      },
    });
  }

  private async withCounts(rows: CampaignRow[]): Promise<CampaignDto[]> {
    if (rows.length === 0) return [];
    const groups = await this.txHost.tx.campaignMessage.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: rows.map((r) => r.id) } },
      _count: { _all: true },
    });
    const counts = new Map<string, CampaignCountsDto>();
    for (const group of groups) {
      const c = counts.get(group.campaignId) ?? emptyCounts();
      const n = group._count._all;
      c.total += n;
      // Un message lu a aussi été délivré et envoyé : les compteurs sont cumulatifs.
      if (group.status === 'QUEUED') c.queued += n;
      if (group.status === 'FAILED') c.failed += n;
      if (group.status === 'SENT' || group.status === 'DELIVERED' || group.status === 'READ') c.sent += n;
      if (group.status === 'DELIVERED' || group.status === 'READ') c.delivered += n;
      if (group.status === 'READ') c.read += n;
      counts.set(group.campaignId, c);
    }
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productTitle: row.productTitle,
      status: row.status,
      counts: counts.get(row.id) ?? emptyCounts(),
      createdAt: row.createdAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    }));
  }
}
