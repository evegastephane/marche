import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

function sameSecret(given: string | null): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(env.revalidateSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Appelée par le worker de l'API après une modification (produit, catalogue, thème, publication).
 * immediate : la page change tout de suite (thème, mise en ligne) ; sinon stale-while-revalidate.
 */
export async function POST(request: NextRequest) {
  if (!sameSecret(request.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ error: 'Secret invalide' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown; immediate?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === 'string').slice(0, 100) : [];
  if (tags.length === 0) return NextResponse.json({ error: 'Aucun tag' }, { status: 400 });
  for (const tag of tags) revalidateTag(tag, body?.immediate === true ? { expire: 0 } : 'max');
  return NextResponse.json({ revalidated: tags });
}
