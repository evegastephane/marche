'use client';

import { ArrowRight } from 'lucide-react';
import { useCallback, useId, useRef } from 'react';
import { SIGN_IN_URL, signUpUrl } from '@/lib/platform';
import { Beam, type Lamp } from './beam';
import { Magnet } from './reactbits/magnet';
import { Sparks } from './reactbits/sparks';
import { Sign } from './sign';
import { useLanding } from './state';

/**
 * Conclusion : la rue, tard. L'enseigne attend le nom (ou le garde allumé s'il a été écrit plus haut) ; sa lumière
 * coule jusqu'au trottoir. La touche orange emporte ce nom vers l'inscription.
 */
export function Closing() {
  const { storeName, watch } = useLanding();
  const typed = storeName.trim().length > 0;
  const inputId = useId();
  const stage = useRef<HTMLElement>(null);
  const bulbs = useRef<(HTMLSpanElement | null)[]>([]);
  const lit = useRef(typed);
  lit.current = typed;

  const readLamps = useCallback((): Lamp[] => {
    const frame = stage.current?.getBoundingClientRect();
    if (!frame) return [];
    return bulbs.current.flatMap((bulb) => {
      if (!bulb) return [];
      const rect = bulb.getBoundingClientRect();
      return [
        {
          x: rect.left + rect.width / 2 - frame.left,
          y: rect.top - frame.top,
          power: lit.current ? 0.95 : 0.55,
          spread: 0.55,
          reach: 1400,
        },
      ];
    });
  }, []);

  return (
    <section
      ref={stage}
      aria-labelledby="conclusion"
      className="relative isolate overflow-hidden bg-[var(--ul-night)]"
    >
      <Beam lamps={readLamps} className="absolute inset-0 z-20 h-full w-full" />
      <div
        aria-hidden
        className="absolute inset-x-[-20%] bottom-[-38%] z-0 h-[70%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(246_107_33/0.32),rgb(246_107_33/0.08)_60%,transparent)] blur-2xl"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[78rem] flex-col items-center gap-10 px-4 pt-28 pb-32 text-center sm:px-6 lg:px-10 lg:pt-36 lg:pb-44">
        <h2
          id="conclusion"
          className="ul-display max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.75rem)]"
        >
          {typed
            ? `${storeName.trim()} ouvre ce soir.`
            : 'Votre boutique ouvre ce soir.'}
        </h2>
        <div className="relative w-full max-w-[46rem] pt-10">
          {[0.24, 0.76].map((at, index) => (
            <span
              key={at}
              aria-hidden
              className="absolute top-0 h-10 w-9 -translate-x-1/2"
              style={{ left: `${at * 100}%` }}
            >
              <svg viewBox="0 0 36 44" className="h-full w-full">
                <path d="M18 0V20" stroke="#2c2b30" strokeWidth="3" />
                <path d="M11 20H25L31 34H5Z" fill="#232227" />
                <path d="M11 20H25L26.5 23H9.5Z" fill="#34333a" />
                <ellipse cx="18" cy="34.5" rx="11" ry="2.2" fill="#ffe4cf" />
              </svg>
              <span
                ref={(element) => {
                  bulbs.current[index] = element;
                }}
                className="absolute bottom-[18%] left-1/2 size-1 -translate-x-1/2"
              />
            </span>
          ))}
          <Sign variant="close" inputId={inputId} />
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Magnet>
              <Sparks onClickBurst>
                <a
                  ref={watch('close')}
                  href={signUpUrl(storeName)}
                  className="ul-cta"
                >
                  Créer ma boutique
                  <ArrowRight aria-hidden strokeWidth={2.2} />
                </a>
              </Sparks>
            </Magnet>
            <a href={SIGN_IN_URL} className="ul-ghost h-12 px-5 text-[1rem]">
              Se connecter
            </a>
          </div>
          <p className="ul-small">
            Votre boutique garde le nom écrit sur l’enseigne.
          </p>
        </div>
      </div>
    </section>
  );
}
