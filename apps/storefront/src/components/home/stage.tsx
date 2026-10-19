'use client';

import { useRef } from 'react';
import {
  EASE,
  gsap,
  MOTION_OK,
  MOTION_REDUCED,
  ScrollTrigger,
  useGSAP,
} from './gsap';
import { TICK_EVENT } from './state';

/*
 * Le décor : l'emblème Upsell démonté en quatre pièces (panier, poignée-flèche, deux roues) qui changent de place
 * à chaque chapitre, pilotées par le défilement. Les roues tournent de la distance parcourue, le pointeur pousse
 * les pièces, chaque événement de la boutique d'exemple fait tourner les roues d'un cran ; au dernier chapitre,
 * les pièces se remontent en chariot.
 *
 * Chaque pièce est un calque de la taille de l'emblème entier (viewBox 376 × 320) qui ne dessine que sa partie :
 * quand tous les calques ont la même transformation, l'emblème est remonté.
 */

const BODY = 'M7 80H260L244 115H65L100 200H257L318 66H369L278 234H79Z';
const ARROW = 'M316.4 70L326 49H254L294 8H369V66L366.8 70Z';
const VB = { w: 376, h: 320 };

type PieceId = 'body' | 'arrow' | 'w1' | 'w2';

/** Centre de chaque partie dans l'emblème (unités du viewBox) : pivot de ses rotations et changements d'échelle. */
const CENTERS: Record<PieceId, { x: number; y: number }> = {
  body: { x: 188, y: 150 },
  arrow: { x: 311.5, y: 39 },
  w1: { x: 132, y: 287 },
  w2: { x: 239, y: 287 },
};
const PIECES: PieceId[] = ['body', 'arrow', 'w1', 'w2'];
const WHEEL_R = 25;

/** Position d'une pièce dans un chapitre : centre en vw/vh depuis le centre de l'écran, échelle, rotation. */
interface Spot {
  x: number;
  y: number;
  s: number;
  r?: number;
}
type Scene = Record<PieceId, Spot>;

/**
 * Un chapitre par section de la page, dans l'ordre ; le dernier remonte l'emblème. Chaque roue garde son bord
 * (w1 à gauche, w2 à droite) et y roule de haut en bas : elle ne traverse jamais le texte. Grandes, elles sortent
 * à moitié de l'écran ; panier et flèche, sombres, passent derrière le texte sans gêner sa lecture.
 */
const SCENES: Scene[] = [
  // Accueil : les pièces encadrent l'accroche.
  {
    body: { x: 31, y: 36, s: 1.25, r: -10 },
    arrow: { x: -35, y: -24, s: 1.6, r: -6 },
    w1: { x: -42, y: 30, s: 3.2 },
    w2: { x: 40, y: -30, s: 1.7 },
  },
  // Gérez : le dashboard au centre.
  {
    body: { x: -40, y: 12, s: 1.1, r: 6 },
    arrow: { x: 44, y: 32, s: 1.3, r: 18 },
    w1: { x: -48, y: -30, s: 1.5 },
    w2: { x: 51, y: 34, s: 2.8 },
  },
  // Publiez.
  {
    body: { x: 42, y: -38, s: 0.9, r: 14 },
    arrow: { x: -42, y: 34, s: 1.5, r: -18 },
    w1: { x: -51, y: 34, s: 2.8 },
    w2: { x: 47, y: -36, s: 1.3 },
  },
  // Encaissez.
  {
    body: { x: -40, y: -32, s: 1.2, r: -12 },
    arrow: { x: 41, y: -34, s: 1.1, r: 8 },
    w1: { x: -47, y: -34, s: 1.3 },
    w2: { x: 51, y: 34, s: 2.6 },
  },
  // Annoncez.
  {
    body: { x: 37, y: 36, s: 1.3, r: 8 },
    arrow: { x: -41, y: -30, s: 1.4, r: -10 },
    w1: { x: -51, y: 36, s: 2.4 },
    w2: { x: 47, y: -32, s: 1.4 },
  },
  // Tout le reste : les pièces se rassemblent sous l'écran, hors des bandes de texte, prêtes à remonter le chariot.
  {
    body: { x: -4, y: 76, s: 0.85, r: 4 },
    arrow: { x: 26, y: 70, s: 0.85, r: -4 },
    w1: { x: -22, y: 74, s: 1 },
    w2: { x: 18, y: 78, s: 1 },
  },
];

/**
 * Au téléphone, le texte occupe toute la largeur : seules les roues restent, et ne font que dépasser des bords.
 * Le panier et la flèche attendent hors de l'écran ; ils n'entrent qu'à la fin, pour remonter le chariot.
 */
const OFFSTAGE = {
  body: { x: 90, y: 20, s: 1, r: 20 },
  arrow: { x: -90, y: -20, s: 1, r: -20 },
};
const NARROW_SCENES: Scene[] = [
  { ...OFFSTAGE, w1: { x: -51, y: 22, s: 1.6 }, w2: { x: 51, y: -40, s: 1.3 } },
  { ...OFFSTAGE, w1: { x: -52, y: -24, s: 1.4 }, w2: { x: 52, y: 30, s: 1.8 } },
  { ...OFFSTAGE, w1: { x: -52, y: 38, s: 1.6 }, w2: { x: 52, y: -38, s: 1.2 } },
  { ...OFFSTAGE, w1: { x: -52, y: -40, s: 1.2 }, w2: { x: 52, y: 28, s: 1.5 } },
  { ...OFFSTAGE, w1: { x: -52, y: 38, s: 1.6 }, w2: { x: 52, y: -30, s: 1.3 } },
  {
    body: { x: -4, y: 76, s: 0.9, r: 4 },
    arrow: { x: 26, y: 70, s: 0.9, r: -4 },
    w1: { x: -22, y: 74, s: 1 },
    w2: { x: 18, y: 78, s: 1 },
  },
];

/** Hauteur, depuis le haut de l'écran, où l'emblème se remonte (en part de la hauteur) ; la conclusion lui laisse cette place. */
export const ASSEMBLY_TOP = 0.27;
/** Largeur de l'emblème remonté, en pixels, selon la largeur de l'écran. */
function assembledWidth(vw: number) {
  return Math.min(250, vw * 0.5);
}

interface Frame {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/** Transformations des calques pour chaque chapitre, en pixels, roues comprises (rotation = distance / rayon). */
function computeFrames(
  vw: number,
  vh: number,
  layerWidth: number,
): Record<PieceId, Frame>[] {
  const k = layerWidth / VB.w;
  const offset = (id: PieceId) => ({
    x: (CENTERS[id].x - VB.w / 2) * k,
    y: (CENTERS[id].y - VB.h / 2) * k,
  });
  const scenes = vw < 768 ? NARROW_SCENES : SCENES;
  const centers: Record<
    PieceId,
    { x: number; y: number; s: number; r: number }
  >[] = scenes.map(
    (scene) =>
      Object.fromEntries(
        PIECES.map((id) => {
          const spot = scene[id];
          return [
            id,
            {
              x: (spot.x / 100) * vw,
              y: (spot.y / 100) * vh,
              s: spot.s,
              r: spot.r ?? 0,
            },
          ];
        }),
      ) as Record<PieceId, { x: number; y: number; s: number; r: number }>,
  );
  // Chapitre final : l'emblème entier, centré horizontalement, à ASSEMBLY_TOP de la hauteur.
  const s = assembledWidth(vw) / layerWidth;
  const ty = (ASSEMBLY_TOP - 0.5) * vh;
  centers.push(
    Object.fromEntries(
      PIECES.map((id) => {
        const o = offset(id);
        return [id, { x: o.x * s, y: ty + o.y * s, s, r: 0 }];
      }),
    ) as Record<PieceId, { x: number; y: number; s: number; r: number }>,
  );

  const spin: Record<PieceId, number> = { body: 0, arrow: 0, w1: 0, w2: 0 };
  return centers.map((scene, index) => {
    const previous = centers[index - 1];
    return Object.fromEntries(
      PIECES.map((id) => {
        const c = scene[id];
        let rotation = c.r;
        if (id === 'w1' || id === 'w2') {
          if (previous) {
            const p = previous[id];
            const dx = c.x - p.x;
            const dy = c.y - p.y;
            const radius = WHEEL_R * k * ((p.s + c.s) / 2);
            // Le long d'un bord, la roue tourne selon qu'elle descend ou monte ; ailleurs, selon qu'elle va à droite ou à gauche.
            const direction =
              (Math.abs(dy) > Math.abs(dx)
                ? Math.sign(dy) * (c.x < 0 ? -1 : 1)
                : Math.sign(dx)) || 1;
            spin[id] +=
              direction * (Math.hypot(dx, dy) / radius) * (180 / Math.PI);
          }
          rotation = spin[id];
        }
        const o = offset(id);
        // Le calque pivote autour du centre de sa pièce : on le déplace pour que ce centre tombe sur la cible.
        return [id, { x: c.x - o.x, y: c.y - o.y, scale: c.s, rotation }];
      }),
    ) as Record<PieceId, Frame>;
  });
}

function origin(id: PieceId) {
  return `${(CENTERS[id].x / VB.w) * 100}% ${(CENTERS[id].y / VB.h) * 100}%`;
}

/** Profondeur de chaque pièce : les plus proches suivent davantage le pointeur. */
const DEPTH: Record<PieceId, number> = {
  body: 0.45,
  arrow: 0.8,
  w1: 1.2,
  w2: 1,
};

export function Stage() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = root.current;
      if (!stage) return;
      const q = (selector: string) =>
        stage.querySelector<HTMLElement>(selector);
      const layer = (id: PieceId, part: string) =>
        q(
          part === 'layout'
            ? `[data-piece="${id}"]`
            : `[data-piece="${id}"] [data-layer="${part}"]`,
        )!;
      // Hors du décor : la portée du contexte GSAP ne doit pas filtrer les sections.
      const sections = [
        ...document.querySelectorAll<HTMLElement>('[data-scene]'),
      ];

      let frames = computeFrames(
        window.innerWidth,
        window.innerHeight,
        layer('body', 'layout').offsetWidth,
      );
      const refresh = () => {
        frames = computeFrames(
          window.innerWidth,
          window.innerHeight,
          layer('body', 'layout').offsetWidth,
        );
      };
      ScrollTrigger.addEventListener('refreshInit', refresh);

      const place = (index: number) => {
        for (const id of PIECES)
          gsap.set(layer(id, 'layout'), { ...frames[index]![id] });
      };

      const mm = gsap.matchMedia();

      mm.add(MOTION_REDUCED, () => {
        place(0);
        gsap.set(stage, { autoAlpha: 0.55 });
      });

      mm.add(MOTION_OK, () => {
        place(0);

        // Entrée : les roues arrivent en roulant, le panier monte, la flèche jaillit.
        const intro = gsap.timeline({ defaults: { ease: EASE } });
        intro
          .from(
            layer('w1', 'intro'),
            {
              x: () => -window.innerWidth * 0.7,
              rotation: -540,
              duration: 2.2,
            },
            0.15,
          )
          .from(
            layer('w2', 'intro'),
            { x: () => window.innerWidth * 0.6, rotation: 420, duration: 2.2 },
            0.3,
          )
          .from(
            layer('body', 'intro'),
            {
              y: () => window.innerHeight * 0.5,
              rotation: 12,
              autoAlpha: 0,
              duration: 2,
            },
            0.2,
          )
          .from(
            layer('arrow', 'intro'),
            {
              x: -140,
              y: 220,
              rotation: -50,
              autoAlpha: 0,
              duration: 1.8,
              ease: 'back.out(1.4)',
            },
            0.55,
          );

        // Un chapitre par section : la pièce passe de la place précédente à la suivante pendant que la section entre.
        sections.forEach((section, i) => {
          const index = i + 1;
          if (!frames[index]) return;
          const last = index === frames.length - 1;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: section.dataset.sceneStart ?? 'top 88%',
              // La conclusion se remonte au plus tard tout en bas de la page, même si elle n'atteint pas le haut de l'écran.
              end:
                section.dataset.sceneEnd ??
                (last
                  ? () =>
                      Math.min(
                        ScrollTrigger.maxScroll(window),
                        section.getBoundingClientRect().top + window.scrollY,
                      )
                  : 'top 12%'),
              scrub: 1.1,
              invalidateOnRefresh: true,
            },
            defaults: { ease: 'none' },
          });
          for (const id of PIECES) {
            tl.fromTo(
              layer(id, 'layout'),
              { ...frames[index - 1]![id] },
              {
                x: () => frames[index]![id].x,
                y: () => frames[index]![id].y,
                scale: () => frames[index]![id].scale,
                rotation: () => frames[index]![id].rotation,
                immediateRender: false,
                ease: 'power2.inOut',
              },
              0,
            );
          }
          if (last) {
            // Remonté, le chariot reprend ses couleurs : panier et flèche clairs, roues sans moyeu.
            tl.to(
              stage.querySelectorAll('[data-tint]'),
              { fill: '#f4f2ee', ease: 'power1.in' },
              0.35,
            );
            tl.to(
              stage.querySelectorAll('[data-hub]'),
              { autoAlpha: 0, ease: 'power1.in' },
              0.5,
            );
          }
        });

        // Une fois l'emblème remonté, le décor défile avec la page jusqu'au pied de page : il ne flotte pas dessus.
        const closing = sections[sections.length - 1];
        if (closing) {
          const closingTop = () =>
            closing.getBoundingClientRect().top + window.scrollY;
          gsap.to(stage, {
            y: () =>
              -Math.max(0, ScrollTrigger.maxScroll(window) - closingTop()),
            ease: 'none',
            scrollTrigger: {
              trigger: closing,
              start: 'top top',
              end: 'max',
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        }

        // Respiration : chaque pièce flotte à son rythme, les roues tournent lentement.
        for (const id of PIECES) {
          const drift = layer(id, 'drift');
          gsap.to(drift, {
            y: gsap.utils.random(-16, 16),
            duration: gsap.utils.random(4.5, 7),
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
          if (id === 'w1' || id === 'w2') {
            gsap.to(drift, {
              rotation: id === 'w1' ? 360 : -360,
              duration: 48,
              ease: 'none',
              repeat: -1,
            });
          } else {
            gsap.to(drift, {
              rotation: gsap.utils.random(-4, 4),
              duration: gsap.utils.random(6, 9),
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
            });
          }
        }

        // Le pointeur : léger parallaxe d'ensemble, et les pièces s'écartent quand il s'approche.
        const pushers = PIECES.map((id) => {
          const el = layer(id, 'push');
          return {
            id,
            part: q(`[data-piece="${id}"] [data-part]`)!,
            x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3' }),
            y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3' }),
          };
        });
        let pointer: { x: number; y: number } | null = null;
        let pending = false;
        const react = () => {
          pending = false;
          if (!pointer) return;
          const nx = pointer.x / window.innerWidth - 0.5;
          const ny = pointer.y / window.innerHeight - 0.5;
          for (const pusher of pushers) {
            const box = pusher.part.getBoundingClientRect();
            const cx = box.left + box.width / 2;
            const cy = box.top + box.height / 2;
            const reach = Math.max(box.width, box.height) / 2 + 160;
            const dx = cx - pointer.x;
            const dy = cy - pointer.y;
            const distance = Math.hypot(dx, dy) || 1;
            const force =
              distance < reach ? (1 - distance / reach) ** 2 * 110 : 0;
            pusher.x(-nx * 46 * DEPTH[pusher.id] + (dx / distance) * force);
            pusher.y(-ny * 34 * DEPTH[pusher.id] + (dy / distance) * force);
          }
        };
        const onMove = (event: PointerEvent) => {
          if (event.pointerType === 'touch') return;
          pointer = { x: event.clientX, y: event.clientY };
          if (!pending) {
            pending = true;
            requestAnimationFrame(react);
          }
        };
        window.addEventListener('pointermove', onMove, { passive: true });

        // Une commande, une vente, un envoi : les roues tournent d'un cran.
        const onTick = (event: Event) => {
          const strength = Number((event as CustomEvent<number>).detail) || 1;
          for (const id of ['w1', 'w2'] as const) {
            gsap.to(layer(id, 'push'), {
              rotation: `+=${Math.round(70 * strength)}`,
              duration: 1,
              ease: 'back.out(2.2)',
              overwrite: 'auto',
            });
          }
        };
        window.addEventListener(TICK_EVENT, onTick);

        return () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener(TICK_EVENT, onTick);
        };
      });

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', refresh);
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden className="uh-stage">
      {PIECES.map((id) => (
        <div
          key={id}
          data-piece={id}
          data-layer="layout"
          className="uh-piece"
          style={{ transformOrigin: origin(id) }}
        >
          <div
            data-layer="intro"
            className="uh-piece-layer"
            style={{ transformOrigin: origin(id) }}
          >
            <div
              data-layer="push"
              className="uh-piece-layer"
              style={{ transformOrigin: origin(id) }}
            >
              <div
                data-layer="drift"
                className="uh-piece-layer"
                style={{ transformOrigin: origin(id) }}
              >
                <svg viewBox={`0 0 ${VB.w} ${VB.h}`} overflow="visible">
                  {id === 'body' && (
                    <path data-part data-tint d={BODY} fill="var(--uh-piece)" />
                  )}
                  {id === 'arrow' && (
                    <path
                      data-part
                      data-tint
                      d={ARROW}
                      fill="var(--uh-piece)"
                    />
                  )}
                  {(id === 'w1' || id === 'w2') && (
                    <g data-part>
                      <circle
                        cx={CENTERS[id].x}
                        cy={CENTERS[id].y}
                        r={WHEEL_R}
                        fill="var(--uh-orange)"
                      />
                      <g data-hub fill="var(--uh-bg)">
                        <circle cx={CENTERS[id].x} cy={CENTERS[id].y} r={4.6} />
                        {[0, 120, 240].map((angle) => (
                          <circle
                            key={angle}
                            cx={
                              CENTERS[id].x +
                              Math.sin((angle * Math.PI) / 180) * 11.5
                            }
                            cy={
                              CENTERS[id].y -
                              Math.cos((angle * Math.PI) / 180) * 11.5
                            }
                            r={1.7}
                          />
                        ))}
                      </g>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
