import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import { color, fcfa, fontFamily, pressScale, progress } from "../brand/theme";
import { CHEMISE, STORE } from "../data";
import { Phone } from "../ui/parts";
import { Swatch } from "../ui/Swatch";
import { Backdrop } from "./Backdrop";

type AnnounceProps = {
  readonly title: string;
  readonly lede: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

const SEND_AT = 50;
const ARRIVE_AT = 72;

/** La campagne : on choisit la nouveauté, on envoie, le message arrive chez les clients. */
const AnnounceInner: React.FC<AnnounceProps> = ({ title, lede, backdrop, style }) => {
  const frame = useCurrentFrame();
  const card = progress(frame, 22, 22);
  const sent = progress(frame, SEND_AT + 4, 12);
  const rise = progress(frame, 30, 34);
  const bubble = progress(frame, ARRIVE_AT, 18);

  return (
    <AbsoluteFill style={{ fontFamily, color: color.ink, ...style }}>
      {backdrop ? <Backdrop name="Fond animé" pieceColor="#17181d" /> : null}
      <AbsoluteFill style={{ padding: "140px 80px 0" }}>
        <Interactive.Div
          name="Titre"
          style={{
            fontSize: 150,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: "-0.045em",
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
            maxWidth: 880,
            fontSize: 48,
            fontWeight: 450,
            lineHeight: 1.22,
            color: "#aeb0b7",
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

        <div
          style={{
            marginTop: 60,
            display: "flex",
            alignItems: "center",
            gap: 26,
            padding: 28,
            borderRadius: 36,
            backgroundColor: "#16171b",
            border: `2px solid ${color.line}`,
            opacity: card,
            translate: `0 ${(1 - card) * 40}px`,
          }}
        >
          <Swatch wax={CHEMISE.wax} width={112} radius={22} scale={1.4} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 27, color: color.ink3 }}>Produit à annoncer</div>
            <div style={{ fontSize: 38, fontWeight: 600, marginTop: 2 }}>{CHEMISE.name}</div>
            <div style={{ fontSize: 28, color: color.ink2, marginTop: 4 }}>
              {sent > 0 ? `Envoyé aux clients d'accord` : `Clients ayant accepté`}
            </div>
          </div>
          <div
            style={{
              height: 96,
              minWidth: 210,
              padding: "0 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 96,
              fontSize: 36,
              fontWeight: 650,
              backgroundColor: sent > 0 ? "#22232a" : color.orange,
              color: sent > 0 ? color.ink : "#101115",
              scale: pressScale(frame, SEND_AT),
            }}
          >
            {sent > 0 ? "Envoyé ✓" : "Envoyer"}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", top: 800 }}>
        <div style={{ translate: `0 ${(1 - rise) * 900}px` }}>
          <Phone width={600} height={1240} screen="#0b141a">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "82px 28px 22px",
                backgroundColor: "#1f2c34",
                color: "#e9edef",
              }}
            >
              <Swatch wax="cercles" width={64} radius={64} scale={0.9} />
              <div>
                <div style={{ fontSize: 30, fontWeight: 600 }}>{STORE.name}</div>
                <div style={{ fontSize: 22, color: "#8696a0" }}>{STORE.city}</div>
              </div>
            </div>
            <div style={{ padding: "34px 24px" }}>
              <div
                style={{
                  width: 470,
                  padding: 12,
                  borderRadius: "8px 28px 28px 28px",
                  backgroundColor: "#202c33",
                  color: "#e9edef",
                  opacity: bubble,
                  translate: `0 ${(1 - bubble) * 30}px`,
                  scale: 0.94 + 0.06 * bubble,
                  transformOrigin: "0 0",
                }}
              >
                <Swatch wax={CHEMISE.wax} width={446} height={300} radius={20} scale={2.2} />
                <div style={{ padding: "16px 10px 4px", fontSize: 30, lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 700 }}>Nouveau : {CHEMISE.name}</div>
                  <div>
                    {CHEMISE.variant} · {fcfa(CHEMISE.price)}
                  </div>
                  <div style={{ fontSize: 23, color: "#8696a0", marginTop: 10 }}>
                    Répondez STOP pour ne plus recevoir nos nouveautés.
                  </div>
                  <div style={{ textAlign: "right", fontSize: 20, color: "#8696a0", marginTop: 6 }}>10:42</div>
                </div>
              </div>
            </div>
          </Phone>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const announceSchema = {
  title: { type: "text-content", default: "", description: "Titre" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const AnnounceScene = Interactive.withSchema({
  Component: AnnounceInner,
  componentName: "<AnnounceScene>",
  schema: announceSchema,
  wrapInSequence: true,
});
