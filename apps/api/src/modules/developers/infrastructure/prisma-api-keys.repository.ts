import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { ApiKeyDto, ApiScope } from '@marche/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { ApiKeyRepository, type AuthenticatedApiKey, type NewApiKey } from '../application/api-keys.ports.js';

type ApiKeyRow = Prisma.ApiKeyGetPayload<object>;

function toDto(row: ApiKeyRow): ApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    hint: `${row.prefix}…${row.last4}`,
    token: row.token,
    scopes: row.scopes as ApiScope[],
    allowedOrigins: row.allowedOrigins,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PrismaApiKeyRepository extends ApiKeyRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async list(): Promise<ApiKeyDto[]> {
    const rows = await this.txHost.tx.apiKey.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200 });
    // Actives d'abord : une clé révoquée reste visible pour l'historique.
    return rows.sort((a, b) => Number(a.revokedAt !== null) - Number(b.revokedAt !== null)).map(toDto);
  }

  async get(id: string): Promise<ApiKeyDto | null> {
    const row = await this.txHost.tx.apiKey.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  }

  async insert(key: NewApiKey): Promise<void> {
    await this.txHost.tx.apiKey.create({ data: key });
  }

  async update(id: string, patch: { name?: string; scopes?: ApiScope[]; allowedOrigins?: string[] }): Promise<boolean> {
    const result = await this.txHost.tx.apiKey.updateMany({ where: { id, revokedAt: null }, data: patch });
    return result.count > 0;
  }

  async revoke(id: string, at: Date): Promise<boolean> {
    const result = await this.txHost.tx.apiKey.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: at } });
    return result.count > 0;
  }

  countActive(): Promise<number> {
    return this.txHost.tx.apiKey.count({ where: { revokedAt: null } });
  }

  async findActiveByHash(tokenHash: string): Promise<AuthenticatedApiKey | null> {
    const row = await this.txHost.tx.apiKey.findFirst({
      where: { tokenHash, revokedAt: null, store: { archivedAt: null } },
      select: { id: true, storeId: true, kind: true, scopes: true, allowedOrigins: true },
    });
    return row;
  }

  async touch(id: string, at: Date): Promise<void> {
    const staleBefore = new Date(at.getTime() - 60_000);
    await this.txHost.tx.apiKey.updateMany({
      where: { id, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: staleBefore } }] },
      data: { lastUsedAt: at },
    });
  }

  async activeOrigins(): Promise<string[]> {
    const rows = await this.txHost.tx.apiKey.findMany({
      where: { kind: 'PUBLISHABLE', revokedAt: null, store: { archivedAt: null } },
      select: { allowedOrigins: true },
    });
    return [...new Set(rows.flatMap((row) => row.allowedOrigins))];
  }
}
