'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useTransition } from 'react';

type EditorMessage =
  | { source: 'upsell-editor'; type: 'refresh' }
  | { source: 'upsell-editor'; type: 'navigate'; path: string }
  | { source: 'upsell-editor'; type: 'focus-section'; id: string };

/** Premier élément affiché d'une section (son enveloppe `data-section-id` n'a pas de boîte). */
function sectionBox(id: string): HTMLElement | null {
  const wrapper = document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`);
  if (!wrapper) return null;
  return [...wrapper.children].find((child): child is HTMLElement => child.getClientRects().length > 0) ?? null;
}

/**
 * Lien entre le site affiché dans l'éditeur du dashboard et l'éditeur : à chaque réglage modifié,
 * l'éditeur demande un rafraîchissement et le site se redessine sans perdre la page ni le défilement.
 * Quand le marchand ouvre ou ajoute une section, l'éditeur demande d'y défiler ; une section toute neuve
 * n'existe qu'après le rafraîchissement, le défilement attend donc la fin de la mise à jour.
 * Le site dit en retour la page affichée et s'il est en train de se mettre à jour.
 */
export function PreviewBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const [updating, startTransition] = useTransition();
  const pendingFocus = useRef<string | null>(null);

  const focusSection = useCallback(() => {
    const id = pendingFocus.current;
    const box = id ? sectionBox(id) : null;
    if (!box) return;
    pendingFocus.current = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent<EditorMessage | null>) => {
      const data = event.data;
      if (!data || data.source !== 'upsell-editor') return;
      if (data.type === 'refresh') startTransition(() => router.refresh());
      if (data.type === 'navigate' && data.path.startsWith('/') && !data.path.startsWith('//')) {
        startTransition(() => router.push(data.path));
      }
      if (data.type === 'focus-section' && typeof data.id === 'string') {
        pendingFocus.current = data.id;
        focusSection();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router, focusSection]);

  useEffect(() => {
    if (window.parent === window) return;
    if (!updating) focusSection();
    // Rien de confidentiel : la page affichée et l'état de mise à jour.
    window.parent.postMessage({ source: 'upsell-preview', type: updating ? 'updating' : 'ready', path: pathname }, '*');
  }, [updating, pathname, focusSection]);

  return null;
}
