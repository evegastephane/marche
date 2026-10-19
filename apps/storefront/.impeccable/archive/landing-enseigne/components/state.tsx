'use client';

import { MotionConfig } from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/** Touches orange de la page : l'en-tête ne s'allume que si aucune autre n'est à l'écran. */
type Spot = 'hero' | 'close';

interface Landing {
  /** Nom écrit sur l'enseigne, repris par le site miniature, la conclusion et l'inscription. */
  storeName: string;
  setStoreName: (name: string) => void;
  /** Nom d'exemple que l'enseigne écrit d'elle-même tant que le visiteur n'a rien tapé. */
  demoName: string;
  setDemoName: (name: string) => void;
  /** Vrai quand aucune touche orange de la page n'est visible : celle de l'en-tête prend la lumière. */
  headerLit: boolean;
  watch: (spot: Spot) => (element: Element | null) => void;
}

const LandingContext = createContext<Landing | null>(null);

export function LandingProvider({ children }: { children: ReactNode }) {
  const [storeName, setStoreName] = useState('');
  const [demoName, setDemoName] = useState('Chez Awa');
  const [visible, setVisible] = useState<Record<Spot, boolean>>({
    hero: true,
    close: false,
  });
  const observer = useRef<IntersectionObserver | null>(null);
  const pending = useRef(new Set<Element>());

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) =>
        setVisible((previous) => {
          const next = { ...previous };
          for (const entry of entries) {
            const spot = (entry.target as HTMLElement).dataset.spot as Spot;
            next[spot] = entry.isIntersecting;
          }
          return next;
        }),
      { threshold: 0.5 },
    );
    for (const element of pending.current) observer.current.observe(element);
    return () => observer.current?.disconnect();
  }, []);

  const watch = useCallback(
    (spot: Spot) => (element: Element | null) => {
      if (!element) return;
      (element as HTMLElement).dataset.spot = spot;
      pending.current.add(element);
      observer.current?.observe(element);
    },
    [],
  );

  return (
    <MotionConfig reducedMotion="user">
      <LandingContext.Provider
        value={{
          storeName,
          setStoreName,
          demoName,
          setDemoName,
          headerLit: !visible.hero && !visible.close,
          watch,
        }}
      >
        {children}
      </LandingContext.Provider>
    </MotionConfig>
  );
}

export function useLanding(): Landing {
  const context = useContext(LandingContext);
  if (!context) throw new Error('useLanding hors de LandingProvider');
  return context;
}

/** Nom affiché par la boutique miniature : celui du visiteur, sinon l'exemple en cours. */
export function useShownName(): { name: string; typed: boolean } {
  const { storeName, demoName } = useLanding();
  const typed = storeName.trim().length > 0;
  return { name: typed ? storeName.trim() : demoName, typed };
}
