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
import { fontFamily, pop, progress } from "../brand/theme";
import { UpsellMark } from "../brand/UpsellMark";
import { Wordmark } from "../ui/parts";
import { Backdrop } from "./Backdrop";

type IntroProps = {
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

/** L'emblème s'allume : le panier se trace, la flèche jaillit, les roues s'allument. */
const IntroInner: React.FC<IntroProps> = ({ backdrop, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily, ...style }}>
      {backdrop ? <Backdrop name="Fond animé" pieceColor="#17181d" /> : null}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 72 }}>
        <Interactive.Div
          name="Emblème"
          style={{
            scale: interpolate(frame, [0, 90], [0.94, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <UpsellMark
            width={500}
            color="#f4f2ee"
            trace={progress(frame, 6, 26)}
            arrow={pop(frame, fps, 26)}
            wheels={[pop(frame, fps, 38), pop(frame, fps, 44)]}
          />
        </Interactive.Div>
        <Interactive.Div
          name="Wordmark"
          style={{
            opacity: interpolate(frame, [52, 68], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [52, 78], ["0px 48px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <Wordmark height={150} invert />
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const introSchema = {
  backdrop: {
    type: "boolean",
    default: false,
    description: "Fond animé (aperçu de la scène seule)",
  },
} as const satisfies InteractivitySchema;

export const IntroScene = Interactive.withSchema({
  Component: IntroInner,
  componentName: "<IntroScene>",
  schema: introSchema,
  wrapInSequence: true,
});
