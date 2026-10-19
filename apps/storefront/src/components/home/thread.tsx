'use client';

import { useRef } from 'react';
import {
  gsap,
  MOTION_OK,
  MOTION_REDUCED,
  ScrollTrigger,
  useGSAP,
} from './gsap';

/*
 * Le fil : une ligne orange de 2 px, la poignée-flèche du chariot, qui part de la touche « Créer ma boutique »,
 * passe par la roue de chaque titre de chapitre, longe la marge droite et finit en flèche sur la dernière touche.
 * Elle se dessine au défilement : sa pointe atteint chaque roue quand celle-ci passe aux deux tiers de l'écran.
 * Repères : [data-thread="start"], [data-thread="wheel"] (dans l'ordre de la page), [data-thread="end"].
 */

interface Point {
  x: number;
  y: number;
}

const RADIUS = 36;
/** Hauteur, au-dessus d'une roue, du palier horizontal qui l'amène. */
const LANDING = 120;
/** Part de la hauteur de l'écran où se tient la pointe du fil. */
const TIP = 0.68;

/** Polyligne aux angles arrondis. */
function roundedPath(points: Point[]): string {
  const first = points[0];
  if (!first) return '';
  let d = `M${first.x} ${first.y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    const prev = points[i - 1]!;
    const next = points[i + 1];
    if (!next) {
      d += ` L${p.x} ${p.y}`;
      break;
    }
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y);
    const outLen = Math.hypot(next.x - p.x, next.y - p.y);
    const r = Math.min(RADIUS, inLen / 2, outLen / 2);
    const a = {
      x: p.x - ((p.x - prev.x) / (inLen || 1)) * r,
      y: p.y - ((p.y - prev.y) / (inLen || 1)) * r,
    };
    const b = {
      x: p.x + ((next.x - p.x) / (outLen || 1)) * r,
      y: p.y + ((next.y - p.y) / (outLen || 1)) * r,
    };
    d += ` L${a.x} ${a.y} Q${p.x} ${p.y} ${b.x} ${b.y}`;
  }
  return d;
}

export function Thread() {
  const root = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    const svg = root.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;
    const line = svg.querySelector<SVGPathElement>('[data-line]')!;
    const head = svg.querySelector<SVGPathElement>('[data-head]')!;
    const probe = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    probe.setAttribute('fill', 'none');
    probe.setAttribute('visibility', 'hidden');
    svg.append(probe);

    let stops: { y: number; length: number }[] = [];
    let total = 0;

    const layout = () => {
      const hostBox = host.getBoundingClientRect();
      const local = (box: DOMRect, x: number, y: number): Point => ({
        x: x - hostBox.left,
        y: y - hostBox.top,
      });
      const marks = [
        ...document.querySelectorAll<HTMLElement>('[data-thread]'),
      ];
      const start = marks.find((m) => m.dataset.thread === 'start');
      const end = marks.find((m) => m.dataset.thread === 'end');
      const wheels = marks.filter((m) => m.dataset.thread === 'wheel');
      const container = document.querySelector<HTMLElement>('.uh-container');
      if (!start || !end || !container) return;
      svg.setAttribute('width', String(host.offsetWidth));
      svg.setAttribute('height', String(host.offsetHeight));
      const gutter = container.getBoundingClientRect().right - hostBox.left + 8;

      const s = start.getBoundingClientRect();
      const points: Point[] = [local(s, s.left + s.width / 2, s.bottom + 12)];
      const anchors: { point: Point; index: number }[] = [
        { point: points[0]!, index: 0 },
      ];
      let previous = points[0]!;
      let fromGutter = false;
      for (const wheel of wheels) {
        const box = wheel.getBoundingClientRect();
        const w = local(
          box,
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        if (fromGutter) points.push({ x: gutter, y: w.y - LANDING });
        else points.push({ x: previous.x, y: w.y - LANDING });
        points.push({ x: w.x, y: w.y - LANDING }, w);
        anchors.push({ point: w, index: points.length - 1 });
        // De la roue, le fil descend dans le panneau du chapitre, en ressort à mi-hauteur vers la démonstration
        // voisine (catalogue → site, vente → ticket, envoi → message), puis gagne la marge.
        const link = wheel
          .closest('section')
          ?.querySelector<HTMLElement>('[data-thread="link"]');
        const linkBox = link?.getBoundingClientRect();
        const y = linkBox
          ? linkBox.top + linkBox.height / 2 - hostBox.top
          : w.y + 160;
        points.push({ x: w.x, y }, { x: gutter, y });
        previous = w;
        fromGutter = true;
      }
      const e = end.getBoundingClientRect();
      const target = local(e, e.right + 14, e.top + e.height / 2);
      points.push({ x: gutter, y: target.y }, target);
      anchors.push({ point: target, index: points.length - 1 });

      line.setAttribute('d', roundedPath(points));
      total = line.getTotalLength();
      stops = anchors.map(({ point, index }) => {
        probe.setAttribute('d', roundedPath(points.slice(0, index + 1)));
        return {
          y: point.y + hostBox.top + window.scrollY,
          length: probe.getTotalLength(),
        };
      });
      head.parentElement?.setAttribute(
        'transform',
        `translate(${target.x} ${target.y})`,
      );
      gsap.set(line, { strokeDasharray: total, strokeDashoffset: total });
    };

    /** Longueur dessinée pour une position de défilement : interpolée entre les repères. */
    const drawnAt = (scroll: number) => {
      const y = scroll + window.innerHeight * TIP;
      const first = stops[0];
      if (!first || y <= first.y) return 0;
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1]!;
        const b = stops[i]!;
        if (y <= b.y)
          return (
            a.length +
            ((y - a.y) / Math.max(1, b.y - a.y)) * (b.length - a.length)
          );
      }
      return total;
    };

    gsap.set(head, { scale: 0 });
    // Les démonstrations changent la hauteur de la page (site en ligne, ticket imprimé, campagne envoyée) :
    // tout ce qui dépend du défilement se recale, le fil, les chapitres du décor et les feuilles.
    let pendingRefresh = 0;
    let lastHeight = host.offsetHeight;
    const resize = new ResizeObserver(() => {
      if (host.offsetHeight === lastHeight) return;
      lastHeight = host.offsetHeight;
      window.clearTimeout(pendingRefresh);
      pendingRefresh = window.setTimeout(() => ScrollTrigger.refresh(), 250);
    });
    resize.observe(host);
    const mm = gsap.matchMedia();
    mm.add(`(min-width: 1024px) and ${MOTION_OK}`, () => {
      layout();
      const offset = gsap.quickTo(line, 'strokeDashoffset', {
        duration: 0.5,
        ease: 'power2.out',
      });
      const update = () => {
        const length = drawnAt(window.scrollY);
        offset(total - length);
        gsap.to(head, {
          scale: length >= total - 2 ? 1 : 0,
          duration: 0.4,
          ease: 'back.out(2)',
          overwrite: true,
        });
      };
      const trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: update,
        onRefresh: () => (layout(), update()),
      });
      update();
      return () => trigger.kill();
    });
    mm.add(`(min-width: 1024px) and ${MOTION_REDUCED}`, () => {
      layout();
      gsap.set(line, { strokeDashoffset: 0 });
      gsap.set(head, { scale: 1 });
      const trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onRefresh: () => (layout(), gsap.set(line, { strokeDashoffset: 0 })),
      });
      return () => trigger.kill();
    });
    return () => {
      resize.disconnect();
      window.clearTimeout(pendingRefresh);
      mm.revert();
      probe.remove();
    };
  });

  return (
    <svg ref={root} aria-hidden className="uh-thread">
      <path
        data-line
        fill="none"
        stroke="var(--uh-orange)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g>
        <path
          data-head
          d="M10 -8 L0 0 L10 8"
          fill="none"
          stroke="var(--uh-orange)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transformBox: 'fill-box', transformOrigin: '0% 50%' }}
        />
      </g>
    </svg>
  );
}
