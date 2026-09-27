import { Monitor, Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';
import { snappy } from './motion';

export type ThemePreference = 'light' | 'dark' | 'system';

/** Même clé que le script anti-flash de index.html. */
const STORAGE_KEY = 'upsell-theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

let preference: ThemePreference = typeof window !== 'undefined' ? readPreference() : 'system';

function resolved(pref: ThemePreference): 'light' | 'dark' {
  return pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref;
}

function apply() {
  const dark = resolved(preference) === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#070c1a' : '#f6f7fb');
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session.
  }
  apply();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onSystemChange = () => {
    if (preference === 'system') {
      apply();
      listener();
    }
  };
  media?.addEventListener('change', onSystemChange);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener('change', onSystemChange);
  };
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, () => preference);
  const scheme = useSyncExternalStore(subscribe, () => resolved(preference));
  return { preference: pref, scheme, setPreference: setThemePreference };
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
];

/** Sélecteur clair / sombre / système : la pastille glisse d'une option à l'autre. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { preference: current, setPreference } = useTheme();
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Thème de l’interface"
      className={cn('inline-flex rounded-full bg-surface-2 p-1', className)}
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
            onClick={() => setPreference(option.value)}
            className={cn(
              'relative inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`theme-${group}`}
                className="absolute inset-0 rounded-full bg-surface shadow-lift"
                transition={snappy}
              />
            )}
            <option.icon className="relative size-4" strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}

/** Bouton unique clair ⇄ sombre pour l'en-tête mobile : l'icône tourne en changeant. */
export function ThemeToggle({ className }: { className?: string }) {
  const { scheme, setPreference } = useTheme();
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={next === 'dark' ? 'Passer en thème sombre' : 'Passer en thème clair'}
      className={cn(
        'relative inline-flex size-10 items-center justify-center overflow-hidden rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={scheme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={snappy}
          className="inline-flex"
        >
          {scheme === 'dark' ? <Moon className="size-[1.15rem]" /> : <Sun className="size-[1.15rem]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
