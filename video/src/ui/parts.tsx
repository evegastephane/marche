import type React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { color, progress } from "../brand/theme";

/** Témoin lumineux de l'instrument. `orange` signale ce qui demande l'attention. */
export const Led: React.FC<{
  readonly tone: "orange" | "ink" | "paper" | "off";
  readonly size?: number;
  /** 0 → 1 : intensité de la lueur (pulsation). */
  readonly glow?: number;
}> = ({ tone, size = 16, glow = 1 }) => {
  const fill = {
    orange: color.orange,
    ink: color.paperInk,
    paper: color.ink,
    off: "rgba(134, 136, 145, 0.45)",
  }[tone];
  return (
    <span
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: fill,
        boxShadow:
          tone === "orange"
            ? `0 0 ${size * 1.2}px ${size * 0.25}px rgba(246, 107, 33, ${0.55 * glow})`
            : "none",
      }}
    />
  );
};

/**
 * Chiffres qui roulent : à chaque instant de `at`, la valeur affichée monte et la suivante arrive du bas.
 * `values` a une valeur de plus que `at`.
 */
export const Roll: React.FC<{
  readonly frame: number;
  readonly values: readonly number[];
  readonly at: readonly number[];
  readonly format?: (value: number) => string;
  readonly style?: React.CSSProperties;
}> = ({ frame, values, at, format = String, style }) => {
  let index = 0;
  while (index < at.length && frame >= at[index]) index++;
  const p = index === 0 ? 1 : progress(frame, at[index - 1], 12);
  const previous = index === 0 ? null : values[index - 1];
  return (
    <span
      style={{
        display: "inline-grid",
        overflow: "hidden",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {previous !== null && p < 1 ? (
        <span style={{ gridArea: "1 / 1", translate: `0 ${-p * 100}%`, opacity: 1 - p }}>
          {format(previous)}
        </span>
      ) : null}
      <span style={{ gridArea: "1 / 1", translate: `0 ${(1 - p) * 100}%` }}>
        {format(values[index])}
      </span>
    </span>
  );
};

/** Feuille blanche posée sur la scène sombre, comme les sections compactes de l'accueil. */
export const Sheet: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ padding: 28 }}>
    <div
      style={{
        position: "relative",
        flex: 1,
        borderRadius: 56,
        overflow: "hidden",
        backgroundColor: color.paper,
        color: color.paperInk,
        padding: "112px 72px 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/** Téléphone : coque noire, écran arrondi, encoche. */
export const Phone: React.FC<{
  readonly width: number;
  readonly height: number;
  readonly screen: string;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ width, height, screen, children, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 78,
      padding: 14,
      backgroundColor: "#050506",
      boxShadow:
        "0 80px 140px rgba(0, 0, 0, 0.55), inset 0 0 0 2px rgba(255, 255, 255, 0.09)",
      ...style,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 64,
        overflow: "hidden",
        backgroundColor: screen,
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          translate: "-50% 0",
          width: 150,
          height: 42,
          borderRadius: 21,
          backgroundColor: "#050506",
        }}
      />
    </div>
  </div>
);

/** Pointeur de souris ; `press` 0 → 1 l'enfonce légèrement. */
export const Cursor: React.FC<{
  readonly press?: number;
  readonly style?: React.CSSProperties;
}> = ({ press = 0, style }) => (
  <svg
    width={72}
    height={72}
    viewBox="0 0 24 24"
    style={{
      position: "absolute",
      overflow: "visible",
      scale: 1 - press * 0.12,
      transformOrigin: "0 0",
      filter: "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))",
      ...style,
    }}
  >
    <path
      d="M2 1.5 2 19.5 6.9 15.2 10.1 22.4 13.6 20.9 10.5 13.8 17 13.8Z"
      fill="#f4f2ee"
      stroke="#101115"
      strokeWidth={1.3}
      strokeLinejoin="round"
    />
  </svg>
);

/** Onde d'un clic, centrée sur son parent positionné. */
export const Ripple: React.FC<{ readonly frame: number; readonly at: number; readonly size?: number }> = ({
  frame,
  at,
  size = 220,
}) => {
  const p = progress(frame, at, 22);
  if (frame < at || p >= 1) return null;
  return (
    <span
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: size,
        border: `6px solid ${color.orange}`,
        scale: 0.2 + 0.8 * p,
        opacity: 1 - p,
        pointerEvents: "none",
      }}
    />
  );
};

/** Wordmark « Upsell » du logo fourni (noir) ; `invert` le passe en clair sur la scène sombre. */
export const Wordmark: React.FC<{ readonly height: number; readonly invert?: boolean }> = ({
  height,
  invert = false,
}) => (
  <Img
    src={staticFile("upsell-wordmark.png")}
    style={{
      display: "block",
      height,
      width: (height * 517) / 191,
      filter: invert ? "invert(1) brightness(0.98) sepia(0.04)" : "none",
    }}
  />
);
