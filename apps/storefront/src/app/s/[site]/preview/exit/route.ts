import { type NextRequest, NextResponse } from 'next/server';
import { PREVIEW_COOKIE, publicOrigin } from '@/lib/site';

/** Quitter l'aperçu : retour au site tel que les visiteurs le voient. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', publicOrigin(request)));
  response.cookies.delete(PREVIEW_COOKIE);
  return response;
}
