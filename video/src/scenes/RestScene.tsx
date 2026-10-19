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
import { color, fontFamily, pop } from "../brand/theme";
import { Led, Sheet } from "../ui/parts";
import { Backdrop } from "./Backdrop";

type RestProps = {
  readonly title: string;
  readonly lede: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

/** Une capacité de plus : la pastille s'enfonce en place. */
const Chip: React.FC<{ readonly children: string; readonly delay: number }> = ({ children, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(frame, fps, delay);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "32px 46px",
        borderRadius: 999,
        border: `2px solid ${color.paperLine2}`,
        backgroundColor: "#f6f5f2",
        fontSize: 52,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        opacity: Math.min(1, enter * 1.6),
        scale: 0.7 + 0.3 * enter,
      }}
    >
      <Led tone="ink" size={14} />
      {children}
    </div>
  );
};

/** Tout le reste : ce que l'accueil liste sous « Tout le reste », sans rien ajouter. */
const RestInner: React.FC<RestProps> = ({ title, lede, backdrop, style }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily, ...style }}>
      {backdrop ? <Backdrop name="Fond animé" pieceColor="#17181d" /> : null}
      <Sheet>
        <Interactive.Div
          name="Titre"
          style={{
            fontSize: 150,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: "-0.045em",
            whiteSpace: "pre-line",
            color: "#101115",
            opacity: interpolate(frame, [10, 28], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [10, 36], ["0px 56px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {title}
        </Interactive.Div>
        <Interactive.Div
          name="Accroche"
          style={{
            marginTop: 30,
            maxWidth: 860,
            fontSize: 48,
            fontWeight: 450,
            lineHeight: 1.22,
            color: "#4a4c54",
            textWrap: "balance",
            opacity: interpolate(frame, [18, 36], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [18, 44], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {lede}
        </Interactive.Div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 26, marginTop: 100 }}>
          <Chip delay={30}>Numéros IMEI</Chip>
          <Chip delay={35}>Import Excel</Chip>
          <Chip delay={40}>Mobile Money en caisse</Chip>
          <Chip delay={45}>Retours et avoirs</Chip>
          <Chip delay={50}>Huit modèles de site</Chip>
          <Chip delay={55}>Équipe et rôles</Chip>
          <Chip delay={60}>Plusieurs boutiques</Chip>
        </div>
      </Sheet>
    </AbsoluteFill>
  );
};

const restSchema = {
  title: { type: "text-content", default: "", description: "Titre (une ligne par retour)" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const RestScene = Interactive.withSchema({
  Component: RestInner,
  componentName: "<RestScene>",
  schema: restSchema,
  wrapInSequence: true,
});
