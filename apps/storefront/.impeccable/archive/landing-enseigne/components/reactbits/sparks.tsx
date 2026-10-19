'use client';

/*
 * Adapté de « ClickSpark » de React Bits (https://reactbits.dev), © 2026 David Haz,
 * licence MIT + Commons Clause (voir ./LICENSE.md).
 * Ici : des étincelles de tube qui démarre. Le canevas déborde de son parent pour que les éclats ne soient
 * pas coupés, l'animation ne tourne que tant qu'il reste des étincelles, et `burst()` permet d'en lancer
 * depuis le code (une lettre qui s'allume sur l'enseigne). Mouvement réduit : aucune étincelle.
 */

import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

interface Spark {
  x: number;
  y: number;
  angle: number;
  speed: number;
  start: number;
}

export interface SparksHandle {
  /** Lance une gerbe au point donné (coordonnées de la fenêtre). */
  burst: (clientX: number, clientY: number, count?: number) => void;
}

const OVERFLOW = 48;
const DURATION = 520;

export const Sparks = forwardRef<
  SparksHandle,
  {
    children?: ReactNode;
    className?: string;
    color?: string;
    /** Étincelles au clic sur le contenu (touches). */
    onClickBurst?: boolean;
  }
>(function Sparks(
  { children, className = '', color = '#ffb27a', onClickBurst = false },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const frame = useRef(0);

  const draw = useCallback(
    (now: number) => {
      const element = canvas.current;
      const context = element?.getContext('2d');
      if (!element || !context) return;
      const ratio = window.devicePixelRatio || 1;
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (element.width !== Math.round(width * ratio)) {
        element.width = Math.round(width * ratio);
        element.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      sparks.current = sparks.current.filter((spark) => {
        const t = (now - spark.start) / DURATION;
        if (t >= 1) return false;
        const eased = t * (2 - t);
        const distance = eased * spark.speed;
        const length = 9 * (1 - eased);
        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        context.strokeStyle = color;
        context.globalAlpha = 1 - t * 0.6;
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.shadowColor = '#f66b21';
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(
          x1 + length * Math.cos(spark.angle),
          y1 + length * Math.sin(spark.angle),
        );
        context.stroke();
        return true;
      });
      frame.current = sparks.current.length ? requestAnimationFrame(draw) : 0;
    },
    [color],
  );

  const burst = useCallback(
    (clientX: number, clientY: number, count = 9) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = canvas.current?.getBoundingClientRect();
      if (!rect) return;
      const now = performance.now();
      const offset = Math.random() * Math.PI;
      for (let index = 0; index < count; index++) {
        sparks.current.push({
          x: clientX - rect.left,
          y: clientY - rect.top,
          angle: offset + (2 * Math.PI * index) / count,
          speed: 16 + Math.random() * 14,
          start: now,
        });
      }
      if (!frame.current) frame.current = requestAnimationFrame(draw);
    },
    [draw],
  );

  useImperativeHandle(ref, () => ({ burst }), [burst]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      className={`relative ${className}`}
      onClick={
        onClickBurst
          ? (event) => {
              const target = event.currentTarget.getBoundingClientRect();
              // Au clavier, le clic n'a pas de position : la gerbe part du centre de la touche.
              const keyboard = event.detail === 0;
              burst(
                keyboard ? target.left + target.width / 2 : event.clientX,
                keyboard ? target.top + target.height / 2 : event.clientY,
                11,
              );
            }
          : undefined
      }
    >
      {children}
      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none absolute z-30"
        style={{
          inset: -OVERFLOW,
          width: `calc(100% + ${OVERFLOW * 2}px)`,
          height: `calc(100% + ${OVERFLOW * 2}px)`,
        }}
      />
    </div>
  );
});
