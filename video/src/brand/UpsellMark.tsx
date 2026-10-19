import type React from "react";
import { useId } from "react";

/* Même tracé que l'emblème du dashboard (apps/dashboard/src/shared/ui/brand.tsx), sur le logo v2. */
export const BODY = "M7 80H260L244 115H65L100 200H257L318 66H369L278 234H79Z";
export const ARROW = "M316.4 70L326 49H254L294 8H369V66L366.8 70Z";
const TRACE = "M300 97H36L90 217H268L356 36";
const WHEELS = [132, 239] as const;

type MarkProps = {
  readonly width: number;
  readonly color: string;
  /** 0 → 1 : le panier se trace. */
  readonly trace?: number;
  /** 0 → 1 (ressort) : la flèche jaillit. */
  readonly arrow?: number;
  /** 0 → 1 (ressort) : chaque roue s'allume. */
  readonly wheels?: readonly [number, number];
  /** 1 : pièces dispersées hors du cadre, 0 : chariot remonté. */
  readonly scatter?: number;
  readonly style?: React.CSSProperties;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Emblème Upsell : chariot dont la poignée jaillit en flèche, sur deux roues orange. */
export const UpsellMark: React.FC<MarkProps> = ({
  width,
  color,
  trace = 1,
  arrow = 1,
  wheels = [1, 1],
  scatter = 0,
  style,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const masked = trace < 1;
  const arrowScale = 0.6 + 0.4 * arrow;

  return (
    <svg
      viewBox="0 0 376 320"
      width={width}
      height={(width * 320) / 376}
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <filter id={`glow-${id}`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        {masked ? (
          <mask
            id={`trace-${id}`}
            maskUnits="userSpaceOnUse"
            x="-20"
            y="-20"
            width="420"
            height="360"
          >
            <path
              d={TRACE}
              fill="none"
              stroke="#fff"
              strokeWidth={76}
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - trace}
            />
          </mask>
        ) : null}
      </defs>

      <g
        transform={`translate(${-560 * scatter} ${220 * scatter}) rotate(${-28 * scatter} 188 157)`}
      >
        <path
          d={BODY}
          fill={color}
          mask={masked ? `url(#trace-${id})` : undefined}
        />
      </g>

      <g
        opacity={clamp01(arrow * 1.4) * (1 - scatter * 0.2)}
        transform={`translate(${-26 * (1 - arrow) + 480 * scatter} ${26 * (1 - arrow) - 620 * scatter}) translate(254 70) scale(${arrowScale}) rotate(${50 * scatter}) translate(-254 -70)`}
      >
        <path d={ARROW} fill={color} />
      </g>

      {WHEELS.map((cx, index) => {
        const lit = wheels[index] ?? 1;
        const dx = (index === 0 ? -340 : 420) * scatter;
        const dy = (index === 0 ? 720 : 640) * scatter;
        return (
          <g
            key={cx}
            transform={`translate(${dx} ${dy}) translate(${cx} 287) scale(${0.3 + 0.7 * lit}) translate(${-cx} -287)`}
            opacity={clamp01(lit * 1.5)}
          >
            <circle
              cx={cx}
              cy={287}
              r={34}
              fill="#f66b21"
              opacity={0.55}
              filter={`url(#glow-${id})`}
            />
            <circle cx={cx} cy={287} r={25} fill="#f66b21" />
          </g>
        );
      })}
    </svg>
  );
};
