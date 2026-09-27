import { Global, Module } from '@nestjs/common';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { ActorContext } from '../../application/actor-context.port.js';
import { PRISMA } from '../prisma/prisma.client.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TenantContext } from './tenant-context.js';

/**
 * Contexte par requête (AsyncLocalStorage) + Unit of Work Prisma.
 * `mountMiddleware` : un contexte est ouvert pour chaque requête HTTP ; le worker ouvre les siens.
 */
export function createClsModule(options: { mountMiddleware: boolean }) {
  return ClsModule.forRoot({
    global: true,
    middleware: { mount: options.mountMiddleware },
    plugins: [
      new ClsPluginTransactional({
        imports: [PrismaModule],
        adapter: new TransactionalAdapterPrisma({
          prismaInjectionToken: PRISMA,
          defaultTxOptions: { timeout: 15_000, maxWait: 5_000 },
        }),
      }),
    ],
  });
}

@Global()
@Module({
  providers: [TenantContext, { provide: ActorContext, useExisting: TenantContext }],
  exports: [TenantContext, ActorContext],
})
export class TenantContextModule {}
