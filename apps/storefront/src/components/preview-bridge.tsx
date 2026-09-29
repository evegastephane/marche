'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';

type EditorMessage = { source: 'upsell-editor'; type: 'refresh' } | { source: 'upsell-editor'; type: 'navigate'; path: string };

/**
 * Lien entre le site affiché dans l'éditeur du dashboard et l'éditeur : à chaque réglage modifié,
 * l'éditeur demande un rafraîchissement et le site se redessine sans perdre la page ni le défilement.
 * Le site dit en retour la page affichée et s'il est en train de se mettre à jour.
 */
export function PreviewBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const [updating, startTransition] = useTransition();

  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent<EditorMessage | null>) => {
      const data = event.data;
      if (!data || data.source !== 'upsell-editor') return;
      if (data.type === 'refresh') startTransition(() => router.refresh());
      if (data.type === 'navigate' && data.path.startsWith('/') && !data.path.startsWith('//')) {
        startTransition(() => router.push(data.path));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    if (window.parent === window) return;
    // Rien de confidentiel : la page affichée et l'état de mise à jour.
    window.parent.postMessage({ source: 'upsell-preview', type: updating ? 'updating' : 'ready', path: pathname }, '*');
  }, [updating, pathname]);

  return null;
}
