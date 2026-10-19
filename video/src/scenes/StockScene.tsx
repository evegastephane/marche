import { getLength, getPointAtLength } from "@remotion/paths";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import { color, EASE_IN_OUT, fontFamily, progress } from "../brand/theme";
import { ROBE } from "../data";
import { Roll } from "../ui/parts";
import { Backdrop } from "./Backdrop";

type StockProps = {
  readonly title: string;
  readonly lede: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

/* Trois sources (site, caisse, WhatsApp) reliées au même compteur de stock. */
const SOURCES = [
  { label: "Site", x: 230, path: "M230 856 C230 966 540 950 540 1060", start: 40 },
  { label: "Caisse", x: 540, path: "M540 856 L540 1060", start: 62 },
  { label: "WhatsApp", x: 850, path: "M850 856 C850 966 540 950 540 1060", start: 84 },
] as const;
const TRAVEL = 18;

const Pulse: React.FC<{ readonly path: string; readonly frame: number; readonly start: number }> = ({
  path,
  frame,
  start,
}) => {
  const p = progress(frame, start, TRAVEL, EASE_IN_OUT);
  if (frame < start || frame > start + TRAVEL + 4) return null;
  const point = getPointAtLength(path, getLength(path) * p);
  if (!point) return null;
  return (
    <g>
      <circle cx={point.x} cy={point.y} r={26} fill={color.orange} opacity={0.35} filter="url(#pulse-glow)" />
      <circle cx={point.x} cy={point.y} r={12} fill={color.orange} />
    </g>
  );
};

/** « Le stock ne ment jamais » : chaque vente, d'où qu'elle vienne, retire du même compteur. */
const StockInner: React.FC<StockProps> = ({ title, lede, backdrop, style }) => {
  const frame = useCurrentFrame();
  const arrivals = SOURCES.map((source) => source.start + TRAVEL);
  const hit = Math.max(
    ...arrivals.map((at) =>
      interpolate(frame, [at, at + 2, at + 16], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    ),
  );
  const diagram = progress(frame, 18, 24);

  return (
    <AbsoluteFill style={{ fontFamily, color: color.ink, ...style }}>
      {backdrop ? <Backdrop name="Fond animé" pieceColor="#17181d" /> : null}
      <AbsoluteFill style={{ padding: "140px 80px 0" }}>
        <Interactive.Div
          name="Titre"
          style={{
            fontSize: 132,
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: "-0.045em",
            whiteSpace: "pre-line",
            opacity: interpolate(frame, [6, 24], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [6, 32], ["0px 56px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {title}
        </Interactive.Div>
      </AbsoluteFill>

      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: diagram }}>
        <defs>
          <filter id="pulse-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        {SOURCES.map((source) => (
          <path
            key={source.label}
            d={source.path}
            fill="none"
            stroke="rgba(244, 242, 238, 0.2)"
            strokeWidth={4}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - progress(frame, 22, 26)}
          />
        ))}
        {SOURCES.map((source) => (
          <Pulse key={source.label} path={source.path} frame={frame} start={source.start} />
        ))}
      </svg>

      {SOURCES.map((source, index) => {
        const enter = progress(frame, 16 + index * 5, 20);
        return (
          <div
            key={source.label}
            style={{
              position: "absolute",
              top: 760,
              left: source.x,
              translate: `-50% ${(1 - enter) * 30}px`,
              opacity: enter,
              padding: "20px 34px",
              borderRadius: 60,
              backgroundColor: "#16171b",
              border: `2px solid ${color.line2}`,
              fontSize: 44,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {source.label}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          top: 1060,
          left: 180,
          width: 720,
          padding: "34px 40px 30px",
          borderRadius: 44,
          backgroundColor: "#16171b",
          border: `2px solid rgba(246, 107, 33, ${0.15 + 0.6 * hit})`,
          boxShadow: `0 0 ${60 * hit}px rgba(246, 107, 33, ${0.25 * hit})`,
          textAlign: "center",
          opacity: diagram,
          scale: 1 + 0.015 * hit,
        }}
      >
        <div style={{ fontSize: 36, color: color.ink2 }}>
          {ROBE.name} · {ROBE.variant}
        </div>
        <Roll
          frame={frame}
          values={[ROBE.stock, ROBE.stock - 1, ROBE.stock - 2, ROBE.stock - 3]}
          at={arrivals}
          style={{ fontSize: 260, fontWeight: 650, lineHeight: 1.05, letterSpacing: "-0.04em" }}
        />
        <div style={{ fontSize: 36, color: color.ink3 }}>en stock</div>
      </div>

      <Interactive.Div
        name="Accroche"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1560,
          fontSize: 48,
          fontWeight: 450,
          lineHeight: 1.22,
          color: "#aeb0b7",
          textAlign: "center",
          textWrap: "balance",
          opacity: interpolate(frame, [100, 118], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [100, 124], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {lede}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const stockSchema = {
  title: { type: "text-content", default: "", description: "Titre (une ligne par retour)" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const StockScene = Interactive.withSchema({
  Component: StockInner,
  componentName: "<StockScene>",
  schema: stockSchema,
  wrapInSequence: true,
});
