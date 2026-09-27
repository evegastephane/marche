import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { UnitOfWork } from '../../application/unit-of-work.port.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { MarcheClsStore } from '../cls/tenant-context.js';
import { type AppPrismaClient, createPrismaClient, PRISMA } from './prisma.client.js';
import { PrismaUnitOfWork } from './transaction.js';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      inject: [APP_CONFIG, ClsService],
      useFactory: (config: AppConfig, cls: ClsService<MarcheClsStore>): AppPrismaClient =>
        createPrismaClient(config.databaseUrl, {
          storeId: () => (cls.isActive() ? cls.get('storeId') : undefined),
          isSystem: () => cls.isActive() && cls.get('system') === true,
        }),
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule implements OnApplicationShutdown {
  constructor(@Inject(PRISMA) private readonly prisma: AppPrismaClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/** Fournit l'unité de travail : à importer là où le plugin transactionnel est actif. */
@Global()
@Module({
  providers: [{ provide: UnitOfWork, useClass: PrismaUnitOfWork }],
  exports: [UnitOfWork],
})
export class UnitOfWorkModule {}
