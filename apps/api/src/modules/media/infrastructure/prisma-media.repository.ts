import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { Media as MediaRow, Prisma } from '../../../generated/prisma/client.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { MediaRepository } from '../application/media.ports.js';
import { Media } from '../domain/media.aggregate.js';

function toDomain(row: MediaRow): Media {
  return Media.reconstitute(row.id, {
    storeId: row.storeId,
    key: row.key,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    alt: row.alt,
    status: row.status,
    renditions: (row.renditions ?? {}) as Record<string, string>,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class PrismaMediaRepository extends MediaRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findById(id: string): Promise<Media | null> {
    const row = await this.txHost.tx.media.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findManyByIds(ids: readonly string[]): Promise<Media[]> {
    const rows = await this.txHost.tx.media.findMany({ where: { id: { in: [...ids] } } });
    return rows.map(toDomain);
  }

  async insert(media: Media): Promise<void> {
    const m = media.snapshot();
    await this.txHost.tx.media.create({
      data: {
        id: media.id,
        storeId: m.storeId,
        key: m.key,
        mimeType: m.mimeType,
        sizeBytes: m.sizeBytes,
        width: m.width,
        height: m.height,
        alt: m.alt,
        status: m.status,
        renditions: m.renditions as Prisma.InputJsonValue,
        createdAt: m.createdAt,
      },
    });
  }

  async update(media: Media): Promise<void> {
    const m = media.snapshot();
    await this.txHost.tx.media.update({
      where: { id: media.id },
      data: {
        sizeBytes: m.sizeBytes,
        width: m.width,
        height: m.height,
        alt: m.alt,
        status: m.status,
        renditions: m.renditions as Prisma.InputJsonValue,
      },
    });
  }
}
