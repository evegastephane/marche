import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { color, fontFamily, pop, progress } from "../brand/theme";
import { UpsellMark } from "../brand/UpsellMark";
import { Wordmark } from "../ui/parts";
import { Backdrop } from "./Backdrop";

type OutroProps = {
  readonly title: string;
  readonly cta: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

/** Les pièces du chariot reviennent et se remontent, puis l'appel à ouvrir sa boutique. */
const OutroInner: React.FC<OutroProps> = ({ title, cta, backdrop, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const assemble = progress(frame, 14, 46, Easing.bezier(0.33, 1, 0.68, 1));
  const ctaPop = pop(frame, fps, 100);
  const breathe = 0.5 + 0.5 * Math.sin((frame - 112) / 8);

  return (
    <AbsoluteFill style={{ fontFamily, color: color.ink, ...style }}>
      {backdrop ? <Backdrop name="Fond animé" pieceColor="#17181d" /> : null}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 0 }}>
        <UpsellMark width={400} color="#f4f2ee" scatter={1 - assemble} arrow={1} wheels={[1, 1]} />
        <Interactive.Div
          name="Wordmark"
          style={{
            marginTop: 56,
            opacity: interpolate(frame, [54, 70], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [54, 78], ["0px 36px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <Wordmark height={118} invert />
        </Interactive.Div>
        <Interactive.Div
          name="Titre"
          style={{
            marginTop: 120,
            fontSize: 120,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.045em",
            textAlign: "center",
            opacity: interpolate(frame, [74, 90], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [74, 100], ["0px 48px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {title}
        </Interactive.Div>
        <div
          style={{
            marginTop: 64,
            display: "flex",
            alignItems: "center",
            gap: 22,
            height: 136,
            padding: "0 60px",
            borderRadius: 136,
            backgroundColor: color.orange,
            color: "#101115",
            fontSize: 50,
            fontWeight: 650,
            boxShadow: `0 24px ${50 + 30 * breathe}px rgba(246, 107, 33, ${0.25 + 0.15 * breathe})`,
            opacity: Math.min(1, ctaPop * 1.6),
            scale: 0.8 + 0.2 * ctaPop,
          }}
        >
          {cta}
          <svg width={50} height={50} viewBox="0 0 24 24" fill="none" stroke="#101115" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const outroSchema = {
  title: { type: "text-content", default: "", description: "Titre" },
  cta: { type: "text-content", default: "Créer ma boutique", description: "Bouton" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const OutroScene = Interactive.withSchema({
  Component: OutroInner,
  componentName: "<OutroScene>",
  schema: outroSchema,
  wrapInSequence: true,
});
