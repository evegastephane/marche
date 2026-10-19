'use client';

import { ArrowRight } from 'lucide-react';
import { ROOT_DOMAIN, signUpUrl, storeSlug } from '@/lib/platform';
import { Led } from './dashboard/ui';
import { Headline } from './headline';
import { useHome } from './state';

/**
 * Conclusion : l'emblème se remonte au-dessus (décor), le visiteur nomme sa boutique et la crée.
 * Le nom suit jusqu'à l'ouverture de la boutique dans le dashboard.
 */
export function Closing() {
  const { storeName, setStoreName } = useHome();
  const slug = storeSlug(storeName) || 'votre-boutique';

  return (
    <section
      id="ouvrir"
      data-scene
      aria-labelledby="ouvrir-titre"
      className="uh-closing"
    >
      <div aria-hidden className="uh-closing-slot" />
      <div className="uh-container flex flex-col items-center gap-8 text-center">
        <Headline
          id="ouvrir-titre"
          lines={['Ouvrez la vôtre']}
          className="uh-display-l"
        />
        <form
          action={signUpUrl(storeName)}
          onSubmit={(event) => {
            event.preventDefault();
            window.location.href = signUpUrl(storeName);
          }}
          className="uh-field"
        >
          <label htmlFor="nom-boutique" className="sr-only">
            Nom de votre boutique
          </label>
          <input
            id="nom-boutique"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value.slice(0, 40))}
            placeholder="Nom de votre boutique"
            autoComplete="organization"
            spellCheck={false}
          />
          <button type="submit" className="uh-cta" data-thread="end">
            Créer ma boutique
            <ArrowRight aria-hidden strokeWidth={2} />
          </button>
        </form>
        <span className="inline-flex items-center gap-2 text-[0.9375rem] text-[var(--uh-ink-2)] tabular-nums">
          <Led
            tone={storeName.trim() ? 'attention' : 'off'}
            pulse={Boolean(storeName.trim())}
          />
          {slug}.{ROOT_DOMAIN}
        </span>
      </div>
    </section>
  );
}
