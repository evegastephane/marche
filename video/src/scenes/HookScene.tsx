import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import { color, fontFamily, progress } from "../brand/theme";
import { Cursor, Ripple } from "../ui/parts";
import { Backdrop } from "./Backdrop";

type HookProps = {
  readonly title: string;
  /** Mot du titre sur lequel le pointeur clique. */
  readonly clickWord: string;
  readonly lede: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

const CLICK = 62;

/** Le mot cliqué : le pointeur arrive, clique, le mot s'allume en orange. */
const ClickWord: React.FC<{ readonly word: string; readonly frame: number }> = ({ word, frame }) => {
  const approach = progress(frame, 34, 26, Easing.bezier(0.33, 1, 0.68, 1));
  const press = interpolate(frame, [CLICK - 3, CLICK, CLICK + 6], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lit = progress(frame, CLICK, 10);
  return (
    <span
      style={{
        position: "relative",
        color: lit > 0 ? `color-mix(in srgb, ${color.orange} ${lit * 100}%, ${color.ink})` : color.ink,
      }}
    >
      {word}
      <Ripple frame={frame} at={CLICK} size={260} />
      <Cursor
        press={press}
        style={{
          left: "62%",
          top: "58%",
          opacity: interpolate(frame, [34, 42, 92, 100], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `${(1 - approach) * 420}px ${(1 - approach) * 560}px`,
        }}
      />
    </span>
  );
};

/** « Votre boutique, en un clic. » : les lignes montent une à une, puis le pointeur clique. */
const HookInner: React.FC<HookProps> = ({ title, clickWord, lede, backdrop, style }) => {
  const frame = useCurrentFrame();
  const lines = title.split("\n");

  return (
    <AbsoluteFill style={{ fontFamily, color: color.ink, ...style }}>
      {backdrop ? <Backdrop name="Fond animé" pieceColor="#17181d" /> : null}
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px", gap: 64 }}>
        <Interactive.Div
          name="Titre"
          style={{
            fontSize: 168,
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: "-0.045em",
          }}
        >
          {lines.map((line, index) => {
            const at = index * 7;
            const reveal = progress(frame, 4 + at, 26);
            const word = line.indexOf(clickWord);
            return (
              <div key={line} style={{ overflow: "hidden", paddingBottom: 14, marginBottom: -14 }}>
                <div style={{ translate: `0 ${(1 - reveal) * 135}%`, rotate: `${(1 - reveal) * 3}deg`, transformOrigin: "0 100%" }}>
                  {word === -1 ? (
                    line
                  ) : (
                    <>
                      {line.slice(0, word)}
                      <ClickWord word={clickWord} frame={frame} />
                      {line.slice(word + clickWord.length)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Interactive.Div>
        <Interactive.Div
          name="Accroche"
          style={{
            maxWidth: 880,
            fontSize: 50,
            fontWeight: 450,
            lineHeight: 1.22,
            color: "#aeb0b7",
            textWrap: "balance",
            opacity: interpolate(frame, [70, 88], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [70, 96], ["0px 36px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {lede}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const hookSchema = {
  title: { type: "text-content", default: "", description: "Titre (une ligne par retour)" },
  clickWord: { type: "text-content", default: "clic", description: "Mot cliqué" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const HookScene = Interactive.withSchema({
  Component: HookInner,
  componentName: "<HookScene>",
  schema: hookSchema,
  wrapInSequence: true,
});
