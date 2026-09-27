import 'server-only';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

const ROOT_HOST = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3001').toLowerCase().replace(/:\d+$/, '');

/** Boutique servie par la requête en cours, déduite de l'hôte (jamais d'un paramètre client). */
export async function currentSite(): Promise<string> {
  const host = ((await headers()).get('host') ?? '').toLowerCase().replace(/:\d+$/, '');
  const sub = host.endsWith(`.${ROOT_HOST}`) ? host.slice(0, -(ROOT_HOST.length + 1)) : null;
  if (!sub) notFound();
  return sub;
}

export const CART_COOKIE = 'cart_id';

export const cartCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};
