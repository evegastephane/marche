'use server';

import { specialRequestInputSchema } from '@marche/contracts';
import { currentSite } from '@/lib/site';
import { StorefrontApiError, storefrontWrite } from '@/lib/storefront-api';

export type RequestActionResult = { ok: true } | { ok: false; message: string; fields?: Record<string, string> };

const FIELD_MESSAGES: Record<string, string> = {
  firstName: 'Indiquez votre prénom.',
  email: 'Adresse e-mail invalide.',
  phone: 'Numéro de téléphone trop court.',
  quantity: 'Quantité entre 1 et 20.',
};

/**
 * Commande sur demande : une configuration absente du stock ou du catalogue.
 * La boutique répond par un prix et un délai (e-mail), puis crée la commande.
 */
export async function submitSpecialRequest(input: unknown): Promise<RequestActionResult> {
  const parsed = specialRequestInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      fields[key] ??= FIELD_MESSAGES[key] ?? 'À vérifier.';
    }
    return { ok: false, message: 'Quelques champs sont à corriger.', fields };
  }
  try {
    const site = await currentSite();
    await storefrontWrite.specialRequest(site, parsed.data);
    return { ok: true };
  } catch (error) {
    if (error instanceof StorefrontApiError && error.code === 'RATE_LIMITED') {
      return { ok: false, message: 'Trop de demandes envoyées. Réessayez dans une minute.' };
    }
    return { ok: false, message: 'La demande n’a pas pu partir. Réessayez.' };
  }
}
