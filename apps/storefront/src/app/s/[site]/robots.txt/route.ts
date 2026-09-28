import { type NextRequest, NextResponse } from 'next/server';
import { publicOrigin } from '@/lib/site';

/** Robots : tout le catalogue est indexable, pas le panier ni les pages de commande. */
export function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /orders/', 'Disallow: /preview', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
  return new NextResponse(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
