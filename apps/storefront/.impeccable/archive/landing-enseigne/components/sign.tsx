'use client';

import { PenLine } from 'lucide-react';
import { useInView, useReducedMotion } from 'motion/react';
import {
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { signUpUrl } from '@/lib/platform';
import { Sparks, type SparksHandle } from './reactbits/sparks';
import { useLanding } from './state';

/** Boutiques d'exemple (données synthétiques) : l'enseigne les écrit d'elle-même tant que le visiteur n'a rien tapé. */
const DEMO_NAMES = ['Chez Awa', 'Atelier Fatou', 'Wax & Co', 'Bazar Ndiaye'];
const PLACEHOLDER = 'Votre boutique';

type DemoPhase = 'typing' | 'hold' | 'off';

/**
 * L'enseigne d'exemple : les tubes du nom sont posés, ils s'allument un à un, tiennent, s'éteignent ensemble,
 * puis le nom suivant prend leur place.
 */
function useDemoSign(active: boolean) {
  const reduce = useReducedMotion();
  const { setDemoName } = useLanding();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>('typing');
  const name = DEMO_NAMES[index % DEMO_NAMES.length] as string;

  useEffect(() => setDemoName(name), [name, setDemoName]);

  useEffect(() => {
    if (!active || reduce) return;
    let delay = 105;
    let step: () => void;
    if (phase === 'typing' && length < name.length) {
      delay = length === 0 ? 500 : 95 + Math.random() * 70;
      step = () => setLength(length + 1);
    } else if (phase === 'typing') {
      delay = 0;
      step = () => setPhase('hold');
    } else if (phase === 'hold') {
      delay = 2800;
      step = () => setPhase('off');
    } else {
      delay = 650;
      step = () => {
        setLength(0);
        setIndex(index + 1);
        setPhase('typing');
      };
    }
    const timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [active, reduce, phase, length, name, index]);

  if (reduce) return { text: name, litCount: name.length };
  return { text: name, litCount: phase === 'off' ? 0 : length };
}

/** Taille des lettres pour que le nom tienne sur le caisson, quelle que soit sa longueur. */
function useFitSize(
  face: React.RefObject<HTMLDivElement | null>,
  text: string,
  max: number,
) {
  const [size, setSize] = useState(max);
  useLayoutEffect(() => {
    const element = face.current;
    if (!element) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const measure = () => {
      if (!context) return;
      const style = getComputedStyle(element);
      context.font = `820 100px ${style.fontFamily}`;
      const sample = text || PLACEHOLDER;
      const width =
        context.measureText(sample).width -
        2.5 * Math.max(0, sample.length - 1);
      const available = element.clientWidth * 0.94;
      const height = element.clientHeight * 0.8;
      setSize(Math.max(18, Math.min(height, max, (available / width) * 100)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [face, text, max]);
  return size;
}

/** Le nom d'attente s'allume tube par tube quand l'enseigne de conclusion arrive à l'écran. */
function useIgnition(active: boolean, length: number) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setCount(length);
      return;
    }
    if (count >= length) return;
    const timer = setTimeout(() => setCount(count + 1), count ? 90 : 450);
    return () => clearTimeout(timer);
  }, [active, reduce, count, length]);
  return count;
}

/**
 * L'enseigne : on écrit directement dessus. Chaque lettre tapée démarre comme un tube (elle hésite, puis tient).
 * Le champ réel est posé sur les lettres, transparent : curseur, sélection et clavier restent ceux du navigateur.
 * Tant que rien n'est écrit, un tube-curseur clignote au bout du nom et une étiquette invite à écrire.
 */
export function Sign({
  variant,
  inputId,
  demo = false,
  tagAt = 0.5,
}: {
  variant: 'hero' | 'close';
  inputId: string;
  /** Position de l'étiquette « Écrivez ici » sur le bord haut (fraction de la largeur), entre les lampes. */
  tagAt?: number;
  /** L'enseigne de l'accroche écrit des exemples tant qu'on n'y a pas touché. */
  demo?: boolean;
}) {
  const { storeName, setStoreName } = useLanding();
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const typed = storeName.length > 0;
  const demoSign = useDemoSign(demo && !touched && !typed);
  const face = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const inView = useInView(face, { once: true, amount: 0.6 });
  const waiting = useIgnition(
    variant === 'close' && inView && !typed,
    PLACEHOLDER.length,
  );

  const showDemo = demo && !touched && !typed;
  const text = typed ? storeName : showDemo ? demoSign.text : PLACEHOLDER;
  const litCount = typed
    ? storeName.length
    : showDemo
      ? demoSign.litCount
      : focused || variant === 'hero'
        ? 0
        : waiting;
  const lit = litCount > 0;
  const inviting = !typed && !focused;
  const caret = inviting && litCount === text.length;
  const size = useFitSize(face, text, variant === 'hero' ? 118 : 96);

  // Les lettres déjà allumées au montage ne rejouent pas leur démarrage.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  // Chaque lettre tapée démarre dans une gerbe d'étincelles, au bout du nom.
  const sparks = useRef<SparksHandle>(null);
  const previous = useRef(storeName.length);
  useEffect(() => {
    const grew = storeName.length > previous.current;
    previous.current = storeName.length;
    if (!grew || !focused) return;
    const letters = face.current?.querySelectorAll('.ul-letter');
    const last = letters?.[letters.length - 1]?.getBoundingClientRect();
    if (last)
      sparks.current?.burst(
        last.right - last.width * 0.2,
        last.top + last.height * 0.45,
      );
  }, [storeName, focused]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    window.location.href = signUpUrl(storeName);
  };

  return (
    <form
      action={signUpUrl('')}
      method="get"
      onSubmit={submit}
      className="relative isolate w-full"
    >
      <div aria-hidden className="ul-sign-halo -z-10" data-lit={lit} />
      <Sparks ref={sparks}>
        <div
          className="ul-sign py-[clamp(0.55rem,1.3vw,1.15rem)]"
          data-lit={lit}
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            input.current?.focus();
          }}
        >
          <div
            ref={face}
            className={`ul-sign-face mx-auto w-[calc(100%-3rem)] ${
              variant === 'hero'
                ? 'h-[clamp(4.5rem,min(12.5vw,17svh),9.25rem)]'
                : 'h-[clamp(4rem,10vw,7.5rem)]'
            }`}
          >
            <span
              aria-hidden
              className="ul-letters"
              style={{ fontSize: `${size}px` }}
            >
              {[...text].map((char, index) => (
                <span
                  // Une lettre changée est un nouveau tube : il redémarre.
                  key={`${index}-${char}`}
                  className="ul-letter"
                  data-lit={index < litCount}
                  data-ignite={mounted.current || showDemo || !typed}
                >
                  {char}
                </span>
              ))}
              {caret && <span className="ul-caret" />}
            </span>
            <input
              ref={input}
              id={inputId}
              name="boutique"
              className="ul-sign-input"
              style={{ fontSize: `${size}px` }}
              value={storeName}
              maxLength={40}
              autoComplete="organization"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              aria-label="Nom de votre boutique"
              onFocus={() => {
                setTouched(true);
                setFocused(true);
              }}
              onBlur={() => setFocused(false)}
              onChange={(event) =>
                setStoreName(event.target.value.replace(/^\s+/, ''))
              }
            />
          </div>
          {inviting && (
            // Pour la souris et le doigt ; au clavier, le champ lui-même reçoit le focus.
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="ul-write"
              style={{ left: `${tagAt * 100}%` }}
              onClick={() => input.current?.focus()}
            >
              <PenLine strokeWidth={2.2} />
              Écrivez ici
            </button>
          )}
        </div>
      </Sparks>
    </form>
  );
}
