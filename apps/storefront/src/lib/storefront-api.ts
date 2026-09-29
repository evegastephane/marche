import 'server-only';
import {
  type AvailabilityDto,
  type CartDto,
  type CheckoutResultDto,
  type Paginated,
  type Problem,
  type PublicOrderDto,
  STOREFRONT_HEADERS,
  type StorefrontBrandDto,
  type SpecialRequestReceiptDto,
  type StorefrontCollectionDto,
  type StorefrontFacetsDto,
  type StorefrontProductCardDto,
  type StorefrontProductDto,
  type StorefrontSort,
  type StorefrontStoreDto,
} from '@marche/contracts';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { env } from './env';
import { PREVIEW_COOKIE } from './site';

export class StorefrontApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly problem: Problem | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `Erreur ${status}`);
  }
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Un tableau devient un paramètre répété (o=size:M&o=color:Bleu). */
  query?: Record<string, string | number | string[] | undefined>;
  /** Lecture mise en cache (tags revalidés par le worker de l'API). */
  tags?: string[];
  idempotencyKey?: string;
}

/**
 * Appel serveur à serveur vers /storefront/v1. Le secret partagé et l'hôte de la boutique
 * voyagent en en-têtes ; le navigateur ne voit jamais l'API.
 */
async function call<T>(site: string, path: string, options: CallOptions = {}): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (Array.isArray(value)) for (const item of value) search.append(key, item);
    else if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const url = `${env.apiUrl}/storefront/v1${path}${search.size ? `?${search}` : ''}`;
  const requestHeaders: Record<string, string> = {
    [STOREFRONT_HEADERS.token]: env.storefrontToken,
    [STOREFRONT_HEADERS.storeHost]: site,
  };
  if (options.body !== undefined) requestHeaders['content-type'] = 'application/json';
  // Aperçu du brouillon : le thème non publié, jamais mis en cache.
  const preview = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (preview) requestHeaders[STOREFRONT_HEADERS.previewToken] = preview;
  if (options.idempotencyKey) requestHeaders['idempotency-key'] = options.idempotencyKey;
  if (options.method && options.method !== 'GET') {
    // Le throttling de l'API compte par acheteur, pas par serveur Next.
    const forwarded = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) requestHeaders[STOREFRONT_HEADERS.clientIp] = forwarded;
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: requestHeaders,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    ...(options.tags && !preview
      ? { next: { tags: [`site:${site}`, ...options.tags], revalidate: 300 } }
      : { cache: 'no-store' as const }),
  });
  if (!response.ok) {
    let problem: Problem | null = null;
    try {
      problem = (await response.json()) as Problem;
    } catch {
      // réponse non JSON
    }
    throw new StorefrontApiError(response.status, problem?.code ?? 'INTERNAL_ERROR', problem);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** 404 de l'API → page introuvable de Next. */
async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof StorefrontApiError && error.status === 404) notFound();
    throw error;
  }
}

// ───────────── Lectures (en cache) ─────────────

/** Boutique et thème, dédupliqués sur une même requête (layout + page). */
export const getStore = cache((site: string) => orNotFound(call<StorefrontStoreDto>(site, '/store', { tags: [] })));

/** Filtres du catalogue du site (paramètres de l'API storefront). */
export type ProductQuery = {
  collection?: string;
  brand?: string;
  sort?: StorefrontSort;
  limit?: number;
  cursor?: string;
  kind?: string;
  o?: string[];
  a?: string[];
  priceMin?: number;
  priceMax?: number;
};

export async function getProducts(site: string, storeId: string, query: ProductQuery = {}) {
  return call<Paginated<StorefrontProductCardDto>>(site, '/products', { query, tags: [`catalog:${storeId}`, `store:${storeId}`] });
}

export async function getProduct(site: string, storeId: string, slug: string) {
  const product = await orNotFound(call<StorefrontProductDto>(site, `/products/${encodeURIComponent(slug)}`, { tags: [`catalog:${storeId}`] }));
  return product;
}

export async function getCollections(site: string, storeId: string) {
  return call<StorefrontCollectionDto[]>(site, '/collections', { tags: [`catalog:${storeId}`, `store:${storeId}`] });
}

export async function getCollection(site: string, storeId: string, slug: string) {
  return orNotFound(
    call<StorefrontCollectionDto>(site, `/collections/${encodeURIComponent(slug)}`, { tags: [`catalog:${storeId}`] }),
  );
}

export async function getFacets(site: string, storeId: string, query: { collection?: string; kind?: string } = {}) {
  return call<StorefrontFacetsDto>(site, '/facets', { query, tags: [`catalog:${storeId}`] });
}

export async function getBrands(site: string, storeId: string) {
  return call<StorefrontBrandDto[]>(site, '/brands', { tags: [`catalog:${storeId}`] });
}

// ───────────── Lectures en direct (jamais en cache) ─────────────

export async function getAvailability(site: string, variantIds: string[]) {
  if (variantIds.length === 0) return { variants: [] } satisfies AvailabilityDto;
  return call<AvailabilityDto>(site, '/availability', { query: { variantIds: variantIds.join(',') } });
}

export async function getCart(site: string, cartId: string) {
  try {
    return await call<CartDto>(site, `/carts/${cartId}`);
  } catch (error) {
    if (error instanceof StorefrontApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

export async function getPublicOrder(site: string, token: string) {
  return orNotFound(call<PublicOrderDto>(site, `/orders/${encodeURIComponent(token)}`));
}

// ───────────── Écritures ─────────────

export const storefrontWrite = {
  createCart: (site: string) => call<CartDto>(site, '/carts', { method: 'POST' }),
  addLine: (site: string, cartId: string, variantId: string, quantity: number) =>
    call<CartDto>(site, `/carts/${cartId}/lines`, { method: 'POST', body: { variantId, quantity } }),
  addLines: (site: string, cartId: string, lines: { variantId: string; quantity: number }[]) =>
    call<CartDto>(site, `/carts/${cartId}/lines/batch`, { method: 'POST', body: { lines } }),
  specialRequest: (site: string, body: unknown) =>
    call<SpecialRequestReceiptDto>(site, '/special-requests', { method: 'POST', body }),
  updateLine: (site: string, cartId: string, variantId: string, quantity: number) =>
    call<CartDto>(site, `/carts/${cartId}/lines/${variantId}`, { method: 'PATCH', body: { quantity } }),
  removeLine: (site: string, cartId: string, variantId: string) =>
    call<CartDto>(site, `/carts/${cartId}/lines/${variantId}`, { method: 'DELETE' }),
  checkout: (site: string, body: unknown, idempotencyKey: string) =>
    call<CheckoutResultDto>(site, '/checkout', { method: 'POST', body, idempotencyKey }),
};
