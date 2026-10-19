'use client';

import { CheckCheck, ChevronLeft, SendHorizontal, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ROOT_DOMAIN, storeSlug } from '@/lib/platform';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap';
import { SplitReveal } from './reactbits/split-reveal';
import { useShownName } from './state';
import { Swatch } from './wax';

const EASE = [0.16, 1, 0.3, 1] as const;
const MESSAGE = 'Nouvelle collection wax : douze modèles arrivés ce matin.';

type Step = 'idle' | 'sent' | 'typing' | 'replied';

/**
 * Une campagne, de bout en bout (exemple) : le message s'écrit dans l'éditeur du tableau de bord, on appuie
 * sur « Envoyer », il arrive au téléphone d'une cliente qui a accepté de recevoir vos messages, et elle répond.
 * Joué une fois à l'arrivée à l'écran ; mouvement réduit : l'état final, tout de suite.
 */
export function CampaignScene() {
  const scene = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const send = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const { name } = useShownName();
  const slug = storeSlug(name) || 'votre-boutique';

  useGSAP(
    (_context, contextSafe) => {
      const media = gsap.matchMedia();
      media.add(
        { full: MOTION_OK, reduced: '(prefers-reduced-motion: reduce)' },
        (context) => {
          const field = typed.current;
          if (!field) return;
          if (context.conditions?.reduced) {
            field.textContent = MESSAGE;
            setStep('replied');
            return;
          }
          field.textContent = '';
          const later = contextSafe?.((next: Step) => setStep(next));
          const proxy = { length: 0 };
          const play = gsap.timeline({ paused: true });
          play
            .to(proxy, {
              length: MESSAGE.length,
              duration: 2.1,
              ease: 'none',
              onUpdate: () => {
                field.textContent = MESSAGE.slice(0, Math.round(proxy.length));
              },
            })
            .to(
              send.current,
              { scale: 0.92, duration: 0.12, ease: 'power2.in' },
              '+=0.25',
            )
            .to(send.current, {
              scale: 1,
              duration: 0.5,
              ease: 'elastic.out(1, 0.45)',
            })
            .call(() => later?.('sent'), [], '<')
            .call(() => later?.('typing'), [], '+=1.1')
            .call(() => later?.('replied'), [], '+=1.4');
          ScrollTrigger.create({
            trigger: scene.current,
            start: 'top 62%',
            once: true,
            onEnter: () => play.play(),
          });
        },
      );
      return () => media.revert();
    },
    { scope: scene },
  );

  return (
    <div
      ref={scene}
      className="mx-auto grid w-full max-w-[78rem] grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 pt-24 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16 lg:px-10 lg:pt-36"
    >
      <div className="flex flex-col gap-6">
        <SplitReveal
          id="campagnes-titre"
          className="ul-display text-[clamp(2.4rem,5vw,4.25rem)]"
        >
          Vos nouveautés, jusque dans WhatsApp.
        </SplitReveal>
        <p className="ul-lede max-w-[36rem]">
          Une campagne part vers les clients qui ont accepté de la recevoir en
          commandant. Le lien mène droit à votre site ; un « STOP » suffit pour
          ne plus rien recevoir.
        </p>
        <figure
          className="ul-card mt-2 flex max-w-[34rem] flex-col gap-4 p-5 sm:p-6"
          aria-label={`Éditeur de campagne d’exemple : « ${MESSAGE} », envoyé aux clients qui ont accepté.`}
        >
          <div aria-hidden className="flex items-center justify-between gap-3">
            <span className="text-[1rem] font-[680] tracking-[-0.01em]">
              Nouvelle campagne
            </span>
            <span className="text-[0.75rem] text-[var(--ul-ink-3)]">
              Exemple
            </span>
          </div>
          <div
            aria-hidden
            className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-[0.8125rem] text-[var(--ul-ink-2)] ring-1 ring-white/[0.07]"
          >
            <Users className="size-4 shrink-0" strokeWidth={1.8} />
            Clients qui ont accepté de recevoir vos messages
          </div>
          <div
            aria-hidden
            className="flex min-h-[5.5rem] gap-3 rounded-xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.07]"
          >
            <Swatch wax="feuilles" radius={10} className="size-14 shrink-0" />
            <span className="flex min-w-0 flex-col gap-1.5 text-[0.875rem] leading-snug">
              <span>
                <span ref={typed}>{MESSAGE}</span>
                {step === 'idle' && <span className="ul-type-caret" />}
              </span>
              <span className="truncate text-[0.75rem] text-[var(--ul-ink-3)]">
                {slug}.{ROOT_DOMAIN}/collections/wax
              </span>
            </span>
          </div>
          <div aria-hidden className="flex items-center justify-between">
            <span className="text-[0.75rem] text-[var(--ul-ink-3)]">
              {step === 'idle' ? 'Brouillon' : 'Envoyée · 09:30'}
            </span>
            <span
              ref={send}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-[650] transition-colors duration-300 ${
                step === 'idle'
                  ? 'bg-[#f5f1ea] text-[#101115]'
                  : 'bg-[#f66b21] text-[#101115] shadow-[0_8px_22px_-8px_rgb(246_107_33/0.7)]'
              }`}
            >
              <SendHorizontal className="size-4" strokeWidth={2} />
              {step === 'idle' ? 'Envoyer' : 'Envoyée'}
            </span>
          </div>
        </figure>
      </div>
      <CampaignPhone step={step} />
    </div>
  );
}

/** Le téléphone d'une cliente qui a accepté de recevoir les messages de la boutique (message d'exemple). */
function CampaignPhone({ step }: { step: Step }) {
  const { name } = useShownName();
  const slug = storeSlug(name) || 'votre-boutique';
  const arrived = step !== 'idle';

  return (
    <figure
      className="mx-auto w-full max-w-[19rem]"
      aria-label={`Message d’exemple de ${name} sur WhatsApp : la nouvelle collection wax, avec le lien du site, et la réponse d’une cliente.`}
    >
      <div
        aria-hidden
        className="rounded-[2.6rem] bg-[#111114] p-2 shadow-[0_40px_70px_-34px_rgb(17_17_20/0.7)]"
      >
        <div className="flex h-[33rem] flex-col overflow-hidden rounded-[2.1rem] bg-[#ece7df]">
          <div className="flex items-center gap-2.5 bg-[#f7f4ef] px-3 pt-7 pb-3 shadow-[0_1px_0_rgb(17_17_20/0.06)]">
            <ChevronLeft className="size-5 text-[#3b3a36]" strokeWidth={2} />
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1b1a17] text-[0.8125rem] font-[700] text-white">
              {name.slice(0, 1).toUpperCase() || 'V'}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[0.875rem] font-[700] text-[#1b1a17]">
                {name}
              </span>
              <span className="text-[0.6875rem] text-[#6b6962]">
                {step === 'typing' ? 'écrit…' : 'WhatsApp'}
              </span>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-2.5 p-3">
            <span className="self-center rounded-md bg-[#f7f4ef]/80 px-2 py-0.5 text-[0.6875rem] text-[#6b6962]">
              Aujourd’hui
            </span>
            <AnimatePresence>
              {arrived && (
                <motion.div
                  key="campagne"
                  initial={{ opacity: 0, y: 26, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="flex max-w-[86%] origin-bottom-left flex-col gap-2 self-start rounded-2xl rounded-bl-md bg-white p-1.5 pb-2 text-[#1b1a17] shadow-[0_1px_1px_rgb(17_17_20/0.08)]"
                >
                  <Swatch
                    wax="feuilles"
                    radius={12}
                    className="aspect-[16/10] w-full"
                  />
                  <span className="px-1.5 text-[0.8125rem] leading-snug">
                    {MESSAGE}
                  </span>
                  <span className="truncate px-1.5 text-[0.8125rem] font-[600] text-[#1d3b6f] underline decoration-[#1d3b6f]/30 underline-offset-2">
                    {slug}.{ROOT_DOMAIN}/collections/wax
                  </span>
                  <span className="self-end px-1.5 text-[0.625rem] text-[#8b8880]">
                    09:30
                  </span>
                </motion.div>
              )}
              {step === 'typing' && (
                <motion.div
                  key="ecrit"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    transition: { duration: 0.15 },
                  }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex h-8 origin-bottom-right items-center gap-1 self-end rounded-2xl rounded-br-md bg-[#1b1a17] px-3"
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1.5 rounded-full bg-white/80"
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: dot * 0.12,
                      }}
                    />
                  ))}
                </motion.div>
              )}
              {step === 'replied' && (
                <motion.div
                  key="reponse"
                  initial={{ opacity: 0, y: 12, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="flex origin-bottom-right items-end gap-1.5 self-end rounded-2xl rounded-br-md bg-[#1b1a17] px-3 py-2 text-[0.8125rem] text-white"
                >
                  La bleue existe en M ?
                  <span className="flex items-center gap-0.5 text-[0.625rem] text-white/60">
                    09:34
                    <CheckCheck className="size-3.5" strokeWidth={2} />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <figcaption className="ul-small mt-4 text-center">
        Message d’exemple
      </figcaption>
    </figure>
  );
}
