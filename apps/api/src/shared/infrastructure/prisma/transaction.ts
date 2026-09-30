import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { UnitOfWork, type UnitOfWorkOptions } from '../../application/unit-of-work.port.js';
import type { AppPrismaClient } from './prisma.client.js';

export type PrismaAdapter = TransactionalAdapterPrisma<AppPrismaClient>;

/** Hôte de transaction : `txHost.tx` est le client de la transaction en cours (ou le client normal). */
export type PrismaTransactionHost = TransactionHost<PrismaAdapter>;

/** Client utilisable dans les repositories (transaction en cours ou client de base). */
export type PrismaTx = PrismaTransactionHost['tx'];

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  run<T>(work: () => Promise<T>, options?: UnitOfWorkOptions): Promise<T> {
    // Propagation par défaut « Required » : un appel imbriqué rejoint la transaction en cours.
    if (options?.timeoutMs === undefined) return this.txHost.withTransaction(work);
    return this.txHost.withTransaction({ timeout: options.timeoutMs, maxWait: 10_000 }, work);
  }
}
