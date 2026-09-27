import { Prisma } from '../../../generated/prisma/client.js';

/** Violation d'unicité (P2002). `fields` : colonnes en conflit si Prisma les fournit. */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  if (!field) return true;
  return uniqueViolationTargets(error).some((target) => target.includes(field));
}

export function uniqueViolationTargets(error: Prisma.PrismaClientKnownRequestError): string[] {
  const meta = error.meta as Record<string, unknown> | undefined;
  const target = meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [target];
  // Avec les adaptateurs de pilote, la cible peut être décrite dans driverAdapterError.
  const adapterError = meta?.driverAdapterError as
    | { cause?: { constraint?: { fields?: string[]; index?: string } } }
    | undefined;
  const constraint = adapterError?.cause?.constraint;
  if (constraint?.fields) return constraint.fields.map(String);
  if (constraint?.index) return [constraint.index];
  return [];
}

export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
