import 'server-only';
import { env } from './env';

/** URL publique de l'API, celle que les développeurs appellent (dans les exemples et depuis le navigateur). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
const METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

export interface OpenApiSchema {
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  nullable?: boolean;
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: { content?: Record<string, { schema?: OpenApiSchema }> };
}

interface OpenApiDocument {
  info: { title: string; version: string };
  paths: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;
}

export interface ApiField {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}

export interface ApiOperation {
  id: string;
  anchor: string;
  method: HttpMethod;
  path: string;
  summary: string | null;
  description: string | null;
  access: string;
  params: (ApiField & { in: string })[];
  body: ApiField[];
}

export interface ApiGroup {
  tag: string;
  slug: string;
  api: 'admin' | 'storefront';
  operations: ApiOperation[];
}

/** Routes d'infrastructure (santé, webhooks) : hors de la référence des développeurs. */
const HIDDEN_TAGS = new Set(['santé', 'webhooks']);

/** Ordre de lecture : la vitrine (pk_) d'abord, puis l'administration (sk_) dans l'ordre du métier. */
const TAG_ORDER = [
  'storefront',
  'produits',
  'catégories',
  'attributs',
  'marques',
  'catalogues',
  'packs',
  'médias',
  'stock',
  'commandes',
  'clients',
  'demandes',
];

const TAG_LABELS: Record<string, string> = { storefront: 'Vitrine' };

export function typeOf(schema: OpenApiSchema | undefined): string {
  if (!schema) return '—';
  if (schema.enum) return schema.enum.map(String).join(' | ');
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants) return [...new Set(variants.map(typeOf))].join(' | ');
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : (schema.type ?? 'objet');
  if (type === 'array') return `${typeOf(schema.items)}[]`;
  const base = type === 'object' ? 'objet' : type;
  return `${base}${schema.format ? ` (${schema.format})` : ''}${schema.nullable ? ' | null' : ''}`;
}

function slugOf(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function accessOf(path: string): string {
  if (path.startsWith('/storefront')) return 'x-publishable-key: pk_…';
  if (path.includes('/developers/')) return 'Session Upsell (administrateurs)';
  return 'Authorization: Bearer sk_…';
}

/** Référence des API, lue sur /openapi.json (rafraîchie chaque minute) ; null si l'API ne répond pas. */
export async function loadApiReference(): Promise<{ groups: ApiGroup[]; version: string } | null> {
  let doc: OpenApiDocument;
  try {
    const response = await fetch(`${env.apiUrl}/openapi.json`, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    doc = (await response.json()) as OpenApiDocument;
  } catch {
    return null;
  }

  const byTag = new Map<string, ApiOperation[]>();
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? 'autres';
      if (HIDDEN_TAGS.has(tag) || path.startsWith('/webhooks')) continue;
      const bodySchema = op.requestBody?.content?.['application/json']?.schema;
      const operation: ApiOperation = {
        id: `${method} ${path}`,
        anchor: `${method}-${path}`.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, ''),
        method,
        path,
        summary: op.summary ?? null,
        description: op.description ?? null,
        access: accessOf(path),
        params: (op.parameters ?? [])
          .filter((p) => p.in !== 'header')
          .map((p) => ({
            name: p.name,
            in: p.in,
            type: typeOf(p.schema),
            required: Boolean(p.required),
            description: p.description ?? null,
          })),
        body: Object.entries(bodySchema?.properties ?? {}).map(([name, schema]) => ({
          name,
          type: typeOf(schema),
          required: bodySchema?.required?.includes(name) ?? false,
          description: schema.description ?? null,
        })),
      };
      byTag.set(tag, [...(byTag.get(tag) ?? []), operation]);
    }
  }

  const rank = (tag: string) => {
    const index = TAG_ORDER.indexOf(tag);
    return index === -1 ? TAG_ORDER.length : index;
  };
  const groups = [...byTag]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'fr'))
    .map(([tag, operations]) => ({
      tag: TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1),
      slug: slugOf(tag),
      api: tag === 'storefront' ? ('storefront' as const) : ('admin' as const),
      operations,
    }));
  return { groups, version: doc.info.version };
}
