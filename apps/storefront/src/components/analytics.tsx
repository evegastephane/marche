'use client';

import type { PostHog } from 'posthog-js';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const CONSENT = 'sf-consent';

type Consent = 'granted' | 'denied';

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: [string, Record<string, unknown>][] = [];

function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT, value);
  } catch {
    // Stockage indisponible : le choix vaut pour la visite.
  }
}

/** Charge PostHog (hébergé en UE) seulement après accord, et regroupe les événements par boutique. */
function start(storeId: string): Promise<PostHog | null> {
  if (!KEY) return Promise.resolve(null);
  loading ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: 'history_change',
      person_profiles: 'identified_only',
      persistence: 'localStorage+cookie',
    });
    posthog.group('store', storeId);
    client = posthog;
    for (const [event, properties] of queue.splice(0)) posthog.capture(event, properties);
    return posthog;
  });
  return loading;
}

/** Événement d'usage (produit vu, ajout au panier…) : rien ne part sans accord du visiteur. */
export function track(event: string, properties: Record<string, unknown> = {}) {
  if (!KEY || readConsent() !== 'granted') return;
  if (client) client.capture(event, properties);
  else queue.push([event, properties]);
}

/** Envoie un événement une fois, à l'affichage de la page. */
export function TrackEvent({ event, properties }: { event: string; properties?: Record<string, unknown> }) {
  useEffect(() => {
    track(event, properties);
    // Une fois par affichage : les propriétés sont figées au premier rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}

/**
 * Bandeau de consentement : n'apparaît que si la mesure d'audience est configurée
 * et que le visiteur n'a pas encore choisi. Refuser est aussi simple qu'accepter.
 */
export function ConsentBanner({ storeId, privacyHref }: { storeId: string; privacyHref: string }) {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const reduce = useReducedMotion();

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    if (stored === 'granted') void start(storeId);
  }, [storeId]);

  const choose = (value: Consent) => {
    writeConsent(value);
    setConsent(value);
    if (value === 'granted') void start(storeId);
  };

  return (
    <AnimatePresence>
      {KEY && consent === null && (
        <motion.div
          role="dialog"
          aria-label="Mesure d’audience"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-line bg-bg p-4 text-sm text-fg shadow-[0_18px_40px_-20px_rgb(0_0_0/0.35)] sm:flex-row sm:items-center sm:gap-5"
        >
          <p className="flex-1 text-muted">
            Ce site mesure sa fréquentation pour s’améliorer, avec votre accord.{' '}
            <a href={privacyHref} className="text-fg underline">
              En savoir plus
            </a>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => choose('denied')}
              className="min-h-10 rounded-full border border-line px-4 font-semibold text-fg transition-colors hover:bg-soft"
            >
              Refuser
            </button>
            <button
              type="button"
              onClick={() => choose('granted')}
              className="min-h-10 rounded-full bg-primary px-4 font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              Accepter
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Revenir sur son choix de mesure d'audience (page Confidentialité). */
export function ConsentReset() {
  if (!KEY) return null;
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(CONSENT);
        } catch {
          // rien à effacer
        }
        window.location.reload();
      }}
      className="self-start rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-soft"
    >
      Changer mon choix sur la mesure d’audience
    </button>
  );
}
