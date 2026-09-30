import { z } from 'zod';

// ───────────── Clés d'API (partie Développeurs) ─────────────

export const API_KEY_KINDS = ['PUBLISHABLE', 'SECRET'] as const;
export const apiKeyKindSchema = z.enum(API_KEY_KINDS);
export type ApiKeyKind = z.infer<typeof apiKeyKindSchema>;

/** Préfixe visible d'une clé : il dit à quoi elle sert. */
export const API_KEY_PREFIXES: Record<ApiKeyKind, string> = { PUBLISHABLE: 'pk_', SECRET: 'sk_' };

/** En-tête qui porte une clé publique sur /storefront/v1 (appels depuis le navigateur). */
export const PUBLISHABLE_KEY_HEADER = 'x-publishable-key';

/** Ressources ouvertes aux clés secrètes ; tout le reste (boutique, site, campagnes, clés) leur est fermé. */
export const API_SCOPE_RESOURCES = ['catalog', 'inventory', 'orders', 'customers'] as const;
export type ApiScopeResource = (typeof API_SCOPE_RESOURCES)[number];

export const API_SCOPES = API_SCOPE_RESOURCES.flatMap((resource) => [`${resource}:read`, `${resource}:write`] as const);
export const apiScopeSchema = z.enum([
  'catalog:read',
  'catalog:write',
  'inventory:read',
  'inventory:write',
  'orders:read',
  'orders:write',
  'customers:read',
  'customers:write',
]);
export type ApiScope = z.infer<typeof apiScopeSchema>;

export const API_SCOPE_RESOURCE_LABELS: Record<ApiScopeResource, { label: string; hint: string }> = {
  catalog: { label: 'Catalogue', hint: 'Produits, variantes, catégories, attributs, marques, catalogues, photos' },
  inventory: { label: 'Stock', hint: 'Niveaux, mouvements, IMEI et numéros de série' },
  orders: { label: 'Commandes', hint: 'Commandes, paiement, expédition, demandes' },
  customers: { label: 'Clients', hint: 'Fiches clients et historique d’achat' },
};

/** Droit nécessaire pour une méthode HTTP : lecture pour GET/HEAD, écriture sinon. */
export function requiredScope(resource: ApiScopeResource, method: string): ApiScope {
  const access = method === 'GET' || method === 'HEAD' ? 'read' : 'write';
  return `${resource}:${access}` as ApiScope;
}

/** L'écriture comprend la lecture. */
export function scopeGranted(granted: readonly string[], required: ApiScope): boolean {
  if (granted.includes(required)) return true;
  return required.endsWith(':read') && granted.includes(required.replace(/:read$/, ':write'));
}

/** Origine d'un site (https://www.exemple.com ou http://localhost:3000), sans chemin. */
export const originSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value, ctx) => {
    try {
      const url = new URL(value);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('protocole');
      if (url.pathname !== '/' || url.search || url.hash || url.username) throw new Error('chemin');
      return url.origin;
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'Origine attendue : https://www.exemple.com (http seulement pour localhost), sans chemin',
      });
      return z.NEVER;
    }
  });

const keyNameSchema = z.string().trim().min(1).max(60);
const originsSchema = z
  .array(originSchema)
  .max(20)
  .refine((origins) => new Set(origins).size === origins.length, { error: 'Une origine ne figure qu’une fois' });
const scopesSchema = z
  .array(apiScopeSchema)
  .min(1, { error: 'Accordez au moins un droit' })
  .max(API_SCOPES.length)
  .transform((scopes) => [...new Set(scopes)]);

export const createApiKeySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('PUBLISHABLE'), name: keyNameSchema, allowedOrigins: originsSchema.default([]) }),
  z.object({ kind: z.literal('SECRET'), name: keyNameSchema, scopes: scopesSchema }),
]);
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const updateApiKeySchema = z
  .object({ name: keyNameSchema, allowedOrigins: originsSchema, scopes: scopesSchema })
  .partial()
  .refine((input) => Object.keys(input).length > 0, { error: 'Aucune modification fournie' });
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

export interface ApiKeyDto {
  id: string;
  name: string;
  kind: ApiKeyKind;
  /** « pk_…3f9a » : de quoi reconnaître la clé sans la révéler. */
  hint: string;
  /** Clé publique complète (réaffichable) ; null pour une clé secrète. */
  token: string | null;
  scopes: ApiScope[];
  allowedOrigins: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Réponse de création : la clé complète, montrée une seule fois pour une clé secrète. */
export interface CreatedApiKeyDto extends ApiKeyDto {
  secret: string;
}
