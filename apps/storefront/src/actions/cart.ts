'use server';

import type { CartDto } from '@marche/contracts';
import { cookies } from 'next/headers';
import { CART_COOKIE, cartCookieOptions, currentSite } from '@/lib/site';
import { getCart, StorefrontApiError, storefrontWrite } from '@/lib/storefront-api';

export type CartActionResult = { ok: true; itemsCount: number } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  INSUFFICIENT_STOCK: 'Il n’en reste plus assez en stock.',
  ITEM_UNAVAILABLE: 'Cet article n’est plus disponible.',
  VALIDATION_FAILED: 'Quantité invalide.',
  RATE_LIMITED: 'Trop de demandes. Patientez quelques secondes.',
};

function failure(error: unknown): CartActionResult {
  const code = error instanceof StorefrontApiError ? error.code : 'INTERNAL_ERROR';
  return { ok: false, message: MESSAGES[code] ?? 'L’opération n’a pas abouti. Réessayez.' };
}

/** Panier courant, créé au premier ajout. */
async function ensureCart(site: string): Promise<CartDto> {
  const jar = await cookies();
  const existingId = jar.get(CART_COOKIE)?.value;
  const existing = existingId ? await getCart(site, existingId) : null;
  if (existing) return existing;
  const cart = await storefrontWrite.createCart(site);
  jar.set(CART_COOKIE, cart.id, cartCookieOptions);
  return cart;
}

export async function addToCart(variantId: string, quantity: number): Promise<CartActionResult> {
  try {
    const site = await currentSite();
    const cart = await ensureCart(site);
    const updated = await storefrontWrite.addLine(site, cart.id, variantId, quantity);
    return { ok: true, itemsCount: updated.itemsCount };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCartLine(variantId: string, quantity: number): Promise<CartActionResult> {
  try {
    const site = await currentSite();
    const cartId = (await cookies()).get(CART_COOKIE)?.value;
    if (!cartId) return { ok: false, message: 'Votre panier a expiré.' };
    const updated =
      quantity <= 0
        ? await storefrontWrite.removeLine(site, cartId, variantId)
        : await storefrontWrite.updateLine(site, cartId, variantId, quantity);
    return { ok: true, itemsCount: updated.itemsCount };
  } catch (error) {
    return failure(error);
  }
}
