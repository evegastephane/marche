'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/platform';

type Preference = 'light' | 'system' | 'dark';

const listeners = new Set<() => void>();

function read(): Preference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Choix du visiteur, posé sur <html> (data-up-theme) et gardé dans le navigateur. */
function choose(preference: Preference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Stockage bloqué : le choix vaut pour cette page seulement.
  }
  if (preference === 'system') delete document.documentElement.dataset.upTheme;
  else document.documentElement.dataset.upTheme = preference;
  for (const listener of listeners) listener();
}

const OPTIONS: { value: Preference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'system', label: 'Comme l’appareil', icon: Monitor },
  { value: 'dark', label: 'Sombre', icon: Moon },
];

/** Commutateur à trois positions (clair, appareil, sombre), comme celui du tableau de bord : le curseur glisse. */
export function ThemeSwitch() {
  const current = useSyncExternalStore(
    subscribe,
    read,
    () => 'system' as Preference,
  );
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Thème du site"
      className="up-well up-rail"
    >
      {OPTIONS.map((option) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => choose(option.value)}
            className={`relative inline-flex h-8 w-9 items-center justify-center rounded-lg transition-colors duration-200 max-md:h-10 max-md:w-11 ${
              active
                ? 'text-[var(--up-ink)]'
                : 'text-[var(--up-ink-3)] hover:text-[var(--up-ink)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`theme-${group}`}
                className="up-knob absolute inset-0 rounded-lg"
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 38,
                  mass: 0.9,
                }}
              />
            )}
            <option.icon
              className="relative size-4"
              strokeWidth={1.8}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
