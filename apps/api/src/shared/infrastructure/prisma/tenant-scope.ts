/**
 * Isolation multi-tenant (docs/ARCHITECTURE.md §4.4) : proxy de protection autour de Prisma.
 * Pour chaque modèle « tenant », `storeId` est ajouté au filtre des lectures/écritures
 * et aux données créées. Le SQL brut n'est pas couvert : il filtre `store_id` lui-même.
 */

export const TENANT_MODELS: ReadonlySet<string> = new Set([
  'Brand',
  'Product',
  'ProductVariant',
  'Media',
  'ProductMedia',
  'Collection',
  'CollectionProduct',
  'InventoryLevel',
  'StockMovement',
  'Customer',
  'Order',
  'OrderLine',
  'Site',
  'Campaign',
  'CampaignMessage',
  'ProductRelation',
  'Bundle',
  'BundleItem',
  'SpecialRequest',
]);

const WHERE_OPERATIONS: ReadonlySet<string> = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

export class TenantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantViolationError';
  }
}

type Args = Record<string, unknown>;

function scopedWhere(where: unknown, storeId: string): Args {
  const current = (where ?? {}) as Args;
  if (current.storeId !== undefined && current.storeId !== storeId) {
    throw new TenantViolationError('Filtre sur une autre boutique que la boutique courante');
  }
  return { ...current, storeId };
}

function scopedData(data: unknown, storeId: string): Args {
  const current = (data ?? {}) as Args;
  if (current.storeId !== undefined && current.storeId !== storeId) {
    throw new TenantViolationError('Écriture pour une autre boutique que la boutique courante');
  }
  if (current.store !== undefined) {
    throw new TenantViolationError('Utiliser storeId (et non la relation store) sur un modèle tenant');
  }
  return { ...current, storeId };
}

/** Fonction pure (testée unitairement) : ajoute le périmètre boutique aux arguments d'une opération. */
export function scopeArgs(operation: string, args: Args | undefined, storeId: string): Args {
  const scoped: Args = { ...args };
  if (WHERE_OPERATIONS.has(operation)) {
    scoped.where = scopedWhere(scoped.where, storeId);
    return scoped;
  }
  switch (operation) {
    case 'create':
      scoped.data = scopedData(scoped.data, storeId);
      return scoped;
    case 'createMany':
    case 'createManyAndReturn':
      scoped.data = Array.isArray(scoped.data)
        ? scoped.data.map((row) => scopedData(row, storeId))
        : scopedData(scoped.data, storeId);
      return scoped;
    case 'upsert':
      scoped.where = scopedWhere(scoped.where, storeId);
      scoped.create = scopedData(scoped.create, storeId);
      return scoped;
    default:
      throw new TenantViolationError(`Opération non gérée par l’isolation tenant : ${operation}`);
  }
}
