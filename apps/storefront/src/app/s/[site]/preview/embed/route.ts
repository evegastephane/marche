import { type NextRequest, NextResponse } from 'next/server';
import { EMBED_COOKIE, PREVIEW_COOKIE, publicOrigin } from '@/lib/site';

/**
 * Aperçu intégré à l'éditeur du dashboard (iframe) : le jeton d'aperçu part dans un cookie cloisonné
 * (Partitioned, SameSite=None) qui n'existe que dans l'éditeur ; le site suit alors les réglages en
 * cours d'édition de la session, sans bandeau d'aperçu ni bandeau de consentement.
 */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const response = NextResponse.redirect(new URL('/', publicOrigin(request)));
  if (token && token.length <= 2048 && /^[\w.-]+$/.test(token)) {
    const options = { httpOnly: true, sameSite: 'none' as const, secure: true, partitioned: true, path: '/', maxAge: 30 * 60 };
    response.cookies.set(PREVIEW_COOKIE, token, options);
    response.cookies.set(EMBED_COOKIE, '1', options);
  }
  return response;
}
