import { type NextRequest, NextResponse } from 'next/server';

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3001').toLowerCase();
const ROOT_HOST = ROOT.replace(/:\d+$/, '');

/**
 * Une seule application sert toutes les boutiques : {slug}.<domaine> est réécrit vers /s/{slug}/…
 * Le domaine racine sert la page de la plateforme.
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '');
  const { pathname, search } = request.nextUrl;

  // Pas d'accès direct aux routes internes.
  if (pathname.startsWith('/s/')) return new NextResponse(null, { status: 404 });

  const sub = host.endsWith(`.${ROOT_HOST}`) ? host.slice(0, -(ROOT_HOST.length + 1)) : null;
  if (!sub || sub === 'www') return NextResponse.next();

  return NextResponse.rewrite(new URL(`/s/${sub}${pathname}${search}`, request.url));
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
