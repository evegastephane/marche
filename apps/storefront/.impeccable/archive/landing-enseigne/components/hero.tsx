'use client';

import { ArrowRight, Globe } from 'lucide-react';
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { ROOT_DOMAIN, signUpUrl, storeSlug } from '@/lib/platform';
import { Beam, type Lamp } from './beam';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { Magnet } from './reactbits/magnet';
import { Sparks } from './reactbits/sparks';
import { SplitReveal } from './reactbits/split-reveal';
import { DashboardPhone, DashboardScreen, PhoneSite } from './screens';
import { Sign } from './sign';
import { useLanding, useShownName } from './state';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const span = (value: number, from: number, to: number) =>
  clamp01((value - from) / (to - from));
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Accroche : une devanture de nuit. On écrit le nom de sa boutique sur l'enseigne, elle s'allume ; en défilant,
 * le rideau remonte et l'on entre dans la boutique, sous le faisceau : le site au téléphone, le tableau de bord.
 */
export function HeroScene() {
  const reduce = useReducedMotion() ?? false;
  const { storeName, watch } = useLanding();
  const { name, typed } = useShownName();
  const inputId = useId();

  const scene = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const signBlock = useRef<HTMLDivElement>(null);
  const opening = useRef<HTMLDivElement>(null);
  const bulbs = useRef<(HTMLSpanElement | null)[]>([]);
  const pendants = useRef<(HTMLSpanElement | null)[]>([]);
  const measured = useRef({ copy: 0 });
  const [box, setBox] = useState({ width: 1180, height: 520 });

  useLayoutEffect(() => {
    const measure = () => {
      const stageHeight = stage.current?.clientHeight ?? window.innerHeight;
      const copyHeight = copy.current?.offsetHeight ?? 0;
      const signHeight = signBlock.current?.offsetHeight ?? 0;
      const top = parseFloat(
        getComputedStyle(stage.current ?? document.body).paddingTop,
      );
      measured.current.copy = copyHeight;
      const width = opening.current?.clientWidth ?? 1180;
      const height = reduce
        ? Math.min(660, Math.max(440, width * 0.56))
        : Math.max(360, stageHeight - top - signHeight - 24);
      setBox({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [stage.current, copy.current, signBlock.current]) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [reduce]);

  const { scrollYProgress } = useScroll({
    target: scene,
    offset: ['start start', 'end end'],
  });
  const lift = useTransform(scrollYProgress, (p) =>
    reduce ? 0 : -measured.current.copy * easeInOut(span(p, 0, 0.3)),
  );
  const copyOpacity = useTransform(scrollYProgress, (p) =>
    reduce ? 1 : 1 - span(p, 0.02, 0.17),
  );
  const copyY = useTransform(scrollYProgress, (p) =>
    reduce ? 0 : -48 * span(p, 0, 0.22),
  );
  const open = useTransform(scrollYProgress, (p) =>
    reduce ? 1 : easeInOut(span(p, 0.1, 0.56)),
  );
  const shutterY = useTransform(open, (o) => `${-6 - 95 * o}%`);
  const inside = useTransform(scrollYProgress, (p) =>
    reduce ? 1 : 0.25 + 0.75 * span(p, 0.2, 0.56),
  );
  const insideScale = useTransform(scrollYProgress, (p) =>
    reduce ? 1 : 0.94 + 0.06 * easeOut(span(p, 0.14, 0.62)),
  );
  const captions = useTransform(scrollYProgress, (p) =>
    reduce ? 1 : span(p, 0.5, 0.62),
  );
  // Au téléphone, le site laisse ensuite la place au tableau de bord.
  const swap = useTransform(scrollYProgress, (p) =>
    reduce ? 0 : easeInOut(span(p, 0.68, 0.86)),
  );

  const lit = useRef(false);
  lit.current = typed || name.length > 0;
  // Puissance de chaque lampe de l'enseigne, menée par l'ouverture (0 = éteinte).
  const power = useRef([{ value: 0 }, { value: 0 }, { value: 0 }]);

  /*
   * L'ouverture, une seule fois : le titre monte ligne à ligne (SplitReveal), les lampes s'allument l'une
   * après l'autre en hésitant, l'enseigne descend à sa place, puis la plaque, la touche et le rideau.
   */
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        { full: MOTION_OK, reduced: '(prefers-reduced-motion: reduce)' },
        (context) => {
          const lamps = power.current;
          if (context.conditions?.reduced) {
            gsap.set(lamps, { value: 1 });
            gsap.set('.ul-intro', { visibility: 'inherit' });
            return;
          }
          gsap.set('[data-intro="title"]', { visibility: 'inherit' });
          const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
          intro
            .from(
              '[data-intro="lede"]',
              { autoAlpha: 0, y: 18, duration: 0.9 },
              0.45,
            )
            .from(
              '[data-intro="lamp"]',
              { autoAlpha: 0, y: -14, duration: 0.6, stagger: 0.14 },
              0.55,
            )
            .to(
              lamps,
              {
                keyframes: [
                  { value: 1, duration: 0.05 },
                  { value: 0.15, duration: 0.07 },
                  { value: 0.9, duration: 0.05 },
                  { value: 0.35, duration: 0.09 },
                  { value: 1, duration: 0.25 },
                ],
                stagger: 0.16,
                ease: 'none',
              },
              0.75,
            )
            .from(
              '[data-intro="sign"]',
              { autoAlpha: 0, y: 28, scale: 0.97, duration: 1.1 },
              0.7,
            )
            .from(
              '[data-intro="lintel"] > *',
              { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.08 },
              1.05,
            )
            .from(
              '[data-intro="shopfront"]',
              { autoAlpha: 0, y: 48, duration: 1.2 },
              1.1,
            );
        },
      );
      return () => media.revert();
    },
    { scope: stage },
  );
  const readLamps = useCallback((): Lamp[] => {
    const frame = stage.current?.getBoundingClientRect();
    if (!frame) return [];
    const lamps: Lamp[] = [];
    for (const bulb of bulbs.current) {
      if (!bulb) continue;
      const rect = bulb.getBoundingClientRect();
      if (rect.width === 0) continue;
      lamps.push({
        x: rect.left + rect.width / 2 - frame.left,
        y: rect.top + rect.height / 2 - frame.top,
        power:
          (lit.current ? 0.8 : 0.5) * (power.current[lamps.length]?.value ?? 1),
        spread: 0.5,
        reach: 520,
      });
    }
    // Les suspensions de la boutique : elles s'allument à mesure que le rideau monte.
    for (const bulb of pendants.current) {
      if (!bulb) continue;
      const rect = bulb.getBoundingClientRect();
      if (rect.width === 0) continue;
      lamps.push({
        x: rect.left + rect.width / 2 - frame.left,
        y: rect.top + rect.height / 2 - frame.top,
        power: 1.1 * open.get(),
        spread: 0.44,
        reach: 900,
      });
    }
    return lamps;
  }, [open]);

  return (
    <section
      ref={scene}
      aria-labelledby="accroche"
      className="relative"
      style={{ height: reduce ? 'auto' : '270svh' }}
    >
      <div
        ref={stage}
        className={`ul-wall isolate overflow-hidden pt-[4.75rem] sm:pt-20 ${
          reduce ? 'relative pb-0' : 'sticky top-0 h-[100svh]'
        }`}
      >
        <Beam
          lamps={readLamps}
          className="absolute inset-0 z-20 h-full w-full"
        />
        {/* Le sol : la boutique se fond dans la nuit avant le chapitre suivant. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-24 bg-gradient-to-b from-transparent to-[var(--ul-night)]"
        />
        <motion.div
          style={{ y: lift }}
          className="relative z-10 mx-auto flex w-full max-w-[78rem] flex-col items-center px-4 sm:px-6 lg:px-10"
        >
          <motion.div
            ref={copy}
            style={{ opacity: copyOpacity, y: copyY }}
            className="flex max-w-[52rem] flex-col items-center gap-5 pt-5 pb-7 text-center sm:pt-8 sm:pb-9"
          >
            <SplitReveal
              as="h1"
              id="accroche"
              play="load"
              delay={0.12}
              className="ul-display ul-intro text-[clamp(2.6rem,6.2vw,5.5rem)]"
              data-intro="title"
            >
              Écrivez son nom, votre boutique ouvre.
            </SplitReveal>
            <p
              data-intro="lede"
              className="ul-lede ul-intro max-w-[40rem] sm:text-[1.25rem]"
            >
              Upsell lui donne une adresse, un site et une caisse, tous tenus
              par le même stock : vous ne vendez jamais un article que vous
              n’avez plus.
            </p>
          </motion.div>

          <div
            ref={signBlock}
            className="relative flex w-full max-w-[57rem] flex-col gap-4 pt-10 sm:pt-11"
          >
            {[0.13, 0.5, 0.87].map((at, index) => (
              <SignLamp
                key={at}
                at={at}
                bulb={(element) => {
                  bulbs.current[index] = element;
                }}
              />
            ))}
            <div data-intro="sign" className="ul-intro">
              <Sign variant="hero" inputId={inputId} demo tagAt={0.315} />
            </div>
            <div
              data-intro="lintel"
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div className="ul-intro flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-4">
                <span className="ul-plate self-start">
                  <Globe
                    className="size-4 shrink-0 text-[var(--ul-ink-3)]"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">
                    <span
                      className={
                        typed
                          ? 'font-[600] text-[var(--ul-ink)]'
                          : 'text-[var(--ul-ink-2)]'
                      }
                    >
                      {storeSlug(name) || 'votre-boutique'}
                    </span>
                    <span className="text-[var(--ul-ink-3)]">
                      .{ROOT_DOMAIN}
                    </span>
                  </span>
                </span>
                <span className="ul-small max-w-[30ch]" aria-live="polite">
                  {typed
                    ? 'Votre adresse, proposée à l’inscription si elle est libre.'
                    : 'Un exemple. Écrivez le nom de la vôtre sur l’enseigne.'}
                </span>
              </div>
              <Magnet className="ul-intro max-sm:w-full">
                <Sparks onClickBurst className="w-full">
                  <a
                    ref={watch('hero')}
                    href={signUpUrl(storeName)}
                    className="ul-cta w-full"
                  >
                    Créer ma boutique
                    <ArrowRight aria-hidden strokeWidth={2.2} />
                  </a>
                </Sparks>
              </Magnet>
            </div>
          </div>

          <div
            ref={opening}
            data-intro="shopfront"
            className="ul-opening ul-intro mt-6 w-full max-w-[74rem]"
            style={{ height: box.height }}
          >
            <Interior
              width={box.width}
              height={box.height}
              inside={inside}
              scale={insideScale}
              captions={captions}
              open={open}
              swap={swap}
              pendants={pendants}
            />
            <motion.div
              aria-hidden
              className="ul-shutter"
              style={{ y: shutterY }}
            >
              <span className="ul-shutter-bar">
                <span className="ul-shutter-handle" />
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Lampe col-de-cygne au-dessus de l'enseigne ; son ampoule est la source d'un faisceau. */
function SignLamp({
  at,
  bulb,
}: {
  at: number;
  bulb: (element: HTMLSpanElement | null) => void;
}) {
  return (
    <span
      aria-hidden
      data-intro="lamp"
      className="ul-intro absolute top-0 h-10 w-9 -translate-x-1/2 sm:h-11"
      style={{ left: `${at * 100}%` }}
    >
      <svg viewBox="0 0 36 44" className="h-full w-full">
        <path d="M18 0V20" stroke="#2c2b30" strokeWidth="3" />
        <path d="M11 20H25L31 34H5Z" fill="#232227" />
        <path d="M11 20H25L26.5 23H9.5Z" fill="#34333a" />
        <ellipse cx="18" cy="34.5" rx="11" ry="2.2" fill="#ffe4cf" />
      </svg>
      <span
        ref={bulb}
        className="absolute bottom-[18%] left-1/2 size-1 -translate-x-1/2"
      />
    </span>
  );
}

/** Dans la boutique : le site au téléphone et le tableau de bord, composés à taille fixe puis mis à l'échelle. */
function Interior({
  width,
  height,
  inside,
  scale,
  captions,
  open,
  swap,
  pendants,
}: {
  width: number;
  height: number;
  inside: MotionValue<number>;
  scale: MotionValue<number>;
  captions: MotionValue<number>;
  open: MotionValue<number>;
  swap: MotionValue<number>;
  pendants: React.RefObject<(HTMLSpanElement | null)[]>;
}) {
  const narrow = width < 640;
  const designWidth = narrow ? 360 : 1180;
  const fit = narrow
    ? width / designWidth
    : Math.min(width / designWidth, height / 560, 1.08);
  const siteX = useTransform(swap, (s) => `${-118 * s}%`);
  const boardX = useTransform(swap, (s) => `${118 * (1 - s)}%`);
  const siteCaption = useTransform(() => captions.get() * (1 - swap.get()));
  const boardCaption = useTransform(() => captions.get() * swap.get());
  const pendant = (index: number) => (element: HTMLSpanElement | null) => {
    pendants.current[index] = element;
  };

  return (
    <div
      className="absolute top-0 left-1/2 origin-top"
      style={{
        width: designWidth,
        height: height / fit,
        marginLeft: -designWidth / 2,
        transform: `scale(${fit})`,
      }}
    >
      <motion.div
        className="absolute inset-0 origin-[50%_30%]"
        style={{ opacity: inside, scale }}
      >
        {narrow ? (
          <>
            <Caption
              captions={siteCaption}
              className="absolute top-5 left-[45px] w-[250px]"
              title="Le site, à son adresse"
              text="En ligne d’un clic, sans rien construire."
            />
            <Caption
              captions={boardCaption}
              className="absolute top-5 left-[45px] w-[250px]"
              title="Votre tableau de bord"
              text="Le même stock, au téléphone. Boutique d’exemple."
            />
            <Pendant x={326} cord={58} bulb={pendant(0)} />
            <motion.div
              className="absolute top-[92px] left-[45px]"
              style={{ x: siteX }}
            >
              <PhoneSite />
            </motion.div>
            <motion.div
              className="absolute top-[92px] left-[45px]"
              style={{ x: boardX }}
            >
              <DashboardPhone />
            </motion.div>
            <Edge open={open} className="top-[92px] left-[230px] w-[85px]" />
            <Glare
              open={open}
              className="top-[70px] left-[190px] h-[300px] w-[260px]"
            />
          </>
        ) : (
          <>
            <Caption
              captions={captions}
              className="absolute top-7 left-[76px] w-[300px]"
              title="Le site, à son adresse"
              text="En ligne d’un clic, sans rien construire."
            />
            <Caption
              captions={captions}
              className="absolute top-7 left-[430px] w-[420px]"
              title="Le tableau de bord, sur le même stock"
              text="Du téléphone ou de l’ordinateur, les mêmes chiffres."
            />
            <motion.span
              style={{ opacity: captions }}
              className="absolute top-8 right-[84px] text-[13px] text-[var(--ul-ink-3)]"
            >
              Boutique d’exemple
            </motion.span>
            <Pendant x={52} cord={44} bulb={pendant(0)} />
            <Pendant x={398} cord={44} bulb={pendant(1)} />
            <Pendant x={906} cord={44} bulb={pendant(2)} />
            <DashboardScreen className="absolute top-[110px] left-[336px]" />
            <PhoneSite className="absolute top-[94px] left-[76px]" />
            {/* La lumière frappe les écrans : un bord chaud, un reflet sous chaque suspension. */}
            <Edge open={open} className="top-[110px] left-[300px] w-[200px]" />
            <Edge open={open} className="top-[94px] left-[250px] w-[96px]" />
            <Edge open={open} className="top-[110px] left-[790px] w-[240px]" />
            <Edge open={open} className="top-[94px] left-[76px] w-[150px]" />
            <Glare
              open={open}
              className="top-[90px] left-[-60px] h-[380px] w-[260px]"
            />
            <Glare
              open={open}
              className="top-[96px] left-[250px] h-[360px] w-[300px]"
            />
            <Glare
              open={open}
              className="top-[110px] left-[860px] h-[380px] w-[290px]"
            />
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Suspension du plafond de la boutique ; son ampoule est la source d'un faisceau. */
function Pendant({
  x,
  cord,
  bulb,
}: {
  x: number;
  cord: number;
  bulb: (element: HTMLSpanElement | null) => void;
}) {
  return (
    <span
      aria-hidden
      className="absolute top-0 w-9 -translate-x-1/2"
      style={{ left: x, height: cord + 18 }}
    >
      <svg viewBox={`0 0 36 ${cord + 18}`} className="h-full w-full">
        <path d={`M18 0V${cord}`} stroke="#3a3833" strokeWidth="1.5" />
        <path d={`M12 ${cord}H24L30 ${cord + 13}H6Z`} fill="#232227" />
        <ellipse cx="18" cy={cord + 13.5} rx="10" ry="2" fill="#ffe4cf" />
      </svg>
      <span
        ref={bulb}
        className="absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2"
      />
    </span>
  );
}

/** Reflet chaud de la suspension sur l'écran qu'elle éclaire, au rythme du rideau. */
function Glare({
  open,
  className,
}: {
  open: MotionValue<number>;
  className: string;
}) {
  return (
    <motion.span
      aria-hidden
      style={{ opacity: open }}
      className={`pointer-events-none absolute rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_176_120/0.4),rgb(246_107_33/0.12)_55%,transparent)] mix-blend-screen ${className}`}
    />
  );
}

/** Le bord supérieur d'un écran, chauffé par la lumière qui tombe dessus. */
function Edge({
  open,
  className,
}: {
  open: MotionValue<number>;
  className: string;
}) {
  return (
    <motion.span
      aria-hidden
      style={{ opacity: open }}
      className={`pointer-events-none absolute h-[2px] bg-[linear-gradient(90deg,transparent,rgb(255_222_198),transparent)] shadow-[0_0_10px_rgb(246_107_33/0.8)] ${className}`}
    />
  );
}

function Caption({
  captions,
  className,
  title,
  text,
}: {
  captions: MotionValue<number>;
  className: string;
  title: string;
  text: string;
}) {
  return (
    <motion.p style={{ opacity: captions }} className={className}>
      <span className="block text-[17px] font-[680] tracking-[-0.015em] text-[var(--ul-ink)]">
        {title}
      </span>
      <span className="block text-[14px] text-[var(--ul-ink-2)]">{text}</span>
    </motion.p>
  );
}
