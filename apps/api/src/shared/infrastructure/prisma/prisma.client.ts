import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { MissingTenantError } from '../cls/tenant-context.js';
import { scopeArgs, TENANT_MODELS } from './tenant-scope.js';

export interface TenantScopeSource {
  /** Boutique courante, ou undefined hors contexte. */
  storeId(): string | undefined;
  /** Vrai pour un traitement système (isolation levée). */
  isSystem(): boolean;
}

export function tenantScopeExtension(source: TenantScopeSource) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model) || source.isSystem()) {
            return query(args);
          }
          const storeId = source.storeId();
          if (!storeId) {
            // Jamais d'accès « à l'aveugle » à un modèle tenant.
            throw new MissingTenantError(`${model}.${operation}`);
          }
          return query(scopeArgs(operation, args as Record<string, unknown>, storeId) as typeof args);
        },
      },
    },
  });
}

export function createPrismaClient(databaseUrl: string, source: TenantScopeSource) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter }).$extends(tenantScopeExtension(source));
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;

/** Jeton d'injection du client Prisma étendu (isolation tenant incluse). */
export const PRISMA = Symbol('PRISMA');
