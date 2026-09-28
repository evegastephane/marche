'use server';

import { checkoutSchema } from '@marche/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CART_COOKIE, currentSite } from '@/lib/site';
import { StorefrontApiError, storefrontWrite } from '@/lib/storefront-api';

export interface CheckoutState {
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Le panier a changé (prix, stock) : l'acheteur doit le revoir avant de valider. */
  cartChanged?: boolean;
}

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export async function placeOrder(_previous: CheckoutState, form: FormData): Promise<CheckoutState> {
  const site = await currentSite();
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return { message: 'Votre panier est vide ou a expiré.' };

  const phone = text(form, 'phone');
  const whatsappOptIn = form.get('whatsappOptIn') === '1';
  if (whatsappOptIn && !phone) {
    return { message: 'Vérifiez les champs indiqués.', fieldErrors: { phone: 'Indiquez votre numéro WhatsApp pour recevoir les nouveautés.' } };
  }
  const parsed = checkoutSchema.safeParse({
    cartId,
    email: text(form, 'email'),
    phone,
    note: text(form, 'note'),
    whatsappOptIn: whatsappOptIn || undefined,
    shippingAddress: {
      firstName: text(form, 'firstName'),
      lastName: text(form, 'lastName'),
      phone,
      line1: text(form, 'line1'),
      line2: text(form, 'line2'),
      city: text(form, 'city'),
      region: text(form, 'region'),
      country: text(form, 'country'),
    },
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path.at(-1));
      fieldErrors[key] ??= key === 'email' ? 'Adresse e-mail invalide.' : 'Champ obligatoire.';
    }
    return { message: 'Vérifiez les champs indiqués.', fieldErrors };
  }

  const idempotencyKey = text(form, 'idempotencyKey') ?? crypto.randomUUID();
  let token: string;
  try {
    const result = await storefrontWrite.checkout(site, parsed.data, idempotencyKey);
    token = result.publicToken;
  } catch (error) {
    if (error instanceof StorefrontApiError) {
      if (error.code === 'CART_CHANGED' || error.code === 'INSUFFICIENT_STOCK') {
        return {
          cartChanged: true,
          message: 'Votre panier a changé (prix ou stock). Il a été mis à jour : vérifiez-le avant de valider.',
        };
      }
      if (error.code === 'RATE_LIMITED') return { message: 'Trop de tentatives. Patientez une minute.' };
      if (error.code === 'VALIDATION_FAILED') return { message: 'Vérifiez les champs du formulaire.' };
    }
    return { message: 'La commande n’a pas pu être enregistrée. Réessayez.' };
  }

  jar.delete(CART_COOKIE);
  redirect(`/orders/${token}`);
}
