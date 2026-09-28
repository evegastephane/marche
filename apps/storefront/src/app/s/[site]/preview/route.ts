import { type NextRequest, NextResponse } from 'next/server';
import { PREVIEW_COOKIE, publicOrigin } from '@/lib/site';

/**
 * Lien d'aperçu ouvert depuis l'éditeur du dashboard : le jeton (signé par l'API, valable 30 min)
 * est rangé dans un cookie, puis on affiche l'accueil avec le thème brouillon.
 */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const response = NextResponse.redirect(new URL('/', publicOrigin(request)));
  if (token && token.length <= 2048 && /^[\w.-]+$/.test(token)) {
    response.cookies.set(PREVIEW_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 60,
    });
  }
  return response;
}
