import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { ARROW, BODY } from "../brand/UpsellMark";

type BackdropProps = {
  readonly pieceColor: string;
  readonly style?: React.CSSProperties;
};

/**
 * Scène noire de l'accueil : les pièces du chariot (panier, flèche, roues) dérivent lentement,
 * sur une grille de points qui glisse. Tout dépend de l'image courante : aucune animation CSS.
 */
const BackdropInner: React.FC<BackdropProps> = ({ pieceColor, style }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0e0f12", overflow: "hidden", ...style }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(244, 242, 238, 0.075) 1.6px, transparent 1.8px)",
          backgroundSize: "54px 54px",
          backgroundPosition: `0px ${-t * 14}px`,
          maskImage: "radial-gradient(120% 80% at 50% 45%, #000 20%, transparent 85%)",
        }}
      />
      <svg
        width={width}
        height={height}
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0 }}
      >
        <g
          transform={`translate(${-330 + Math.sin(t * 0.35) * 46} ${120 + Math.cos(t * 0.3) * 34}) rotate(${-16 + Math.sin(t * 0.22) * 5} 188 157) scale(3.1)`}
        >
          <path d={BODY} fill={pieceColor} />
        </g>
        <g
          transform={`translate(${640 + Math.cos(t * 0.4) * 34} ${1260 + Math.sin(t * 0.33) * 44}) rotate(${24 + Math.cos(t * 0.27) * 7} 311 39) scale(2.7)`}
        >
          <path d={ARROW} fill={pieceColor} />
        </g>
        <circle
          cx={170 + Math.sin(t * 0.31) * 30}
          cy={1650 + Math.cos(t * 0.36) * 36}
          r={150}
          fill={pieceColor}
        />
        <circle
          cx={930 + Math.cos(t * 0.29) * 26}
          cy={430 + Math.sin(t * 0.41) * 30}
          r={84}
          fill={pieceColor}
        />
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(90% 45% at 50% 108%, rgba(246, 107, 33, 0.09), transparent 70%), radial-gradient(130% 70% at 50% -10%, rgba(244, 242, 238, 0.05), transparent 60%)",
        }}
      />
    </AbsoluteFill>
  );
};

const backdropSchema = {
  pieceColor: {
    type: "color",
    default: "#17181d",
    description: "Couleur des pièces",
  },
} as const satisfies InteractivitySchema;

export const Backdrop = Interactive.withSchema({
  Component: BackdropInner,
  componentName: "<Backdrop>",
  schema: backdropSchema,
  wrapInSequence: true,
});
