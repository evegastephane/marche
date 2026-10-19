'use client';

import { ArrowRight, MousePointerClick } from 'lucide-react';
import { useRef } from 'react';
import { signUpUrl } from '@/lib/platform';
import { DashboardReplica } from './dashboard/dashboard';
import { EASE, gsap, MOTION_OK, MOTION_REDUCED, useGSAP } from './gsap';
import { Headline } from './headline';
import { useHome } from './state';

/**
 * Premier écran : l'accroche dont les points sont les roues, une phrase, l'action ; puis le dashboard d'exemple,
 * incliné, qui se redresse pendant qu'on descend. On peut y cliquer partout.
 */
export function Hero() {
  const { storeName } = useHome();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_REDUCED, () => {
        gsap.set('[data-intro], [data-screen-intro]', { autoAlpha: 1 });
      });
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          '[data-intro]',
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.2,
            ease: EASE,
            stagger: 0.12,
            delay: 0.95,
          },
        );
        gsap.fromTo(
          '[data-screen-intro]',
          { autoAlpha: 0, y: 140 },
          { autoAlpha: 1, y: 0, duration: 1.8, ease: EASE, delay: 1.2 },
        );
        // Le dashboard se redresse et grandit à mesure qu'il monte.
        gsap.fromTo(
          '[data-screen-tilt]',
          {
            rotateX: 26,
            scale: 0.86,
            transformPerspective: 1800,
            transformOrigin: '50% 0%',
          },
          {
            rotateX: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-screen-tilt]',
              start: 'top 92%',
              end: 'top 18%',
              scrub: 0.8,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative pt-32 sm:pt-40"
      aria-labelledby="accroche"
    >
      <div className="uh-container flex flex-col items-center text-center">
        <Headline
          as="h1"
          id="accroche"
          lines={['Votre boutique', 'En un clic']}
          onLoad
          delay={0.2}
          className="uh-display-xl"
        />
        <p data-intro className="uh-lede mt-7 max-w-[36rem] text-balance">
          Le dashboard, le site, la caisse et WhatsApp, tenus par le même stock.
        </p>
        <div
          data-intro
          className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4"
        >
          <a href={signUpUrl(storeName)} className="uh-cta" data-thread="start">
            Créer ma boutique
            <ArrowRight aria-hidden strokeWidth={2} />
          </a>
          <a href="#publiez" className="uh-link">
            Voir le site en un clic
          </a>
        </div>
      </div>

      <div
        id="gerez"
        data-scene
        data-scene-start="top 55%"
        data-scene-end="top 5%"
        className="uh-container mt-20 scroll-mt-24 sm:mt-24"
      >
        <div data-screen-intro>
          <div data-screen-tilt className="relative">
            <DashboardReplica className="uh-dash-hero" />
          </div>
        </div>
        <p
          data-intro
          className="mt-6 flex items-center gap-2 text-[0.875rem] text-[var(--uh-ink-3)]"
        >
          <MousePointerClick className="size-4" strokeWidth={1.8} aria-hidden />
          Boutique d’exemple : cliquez, tout fonctionne.
        </p>
      </div>
    </section>
  );
}
