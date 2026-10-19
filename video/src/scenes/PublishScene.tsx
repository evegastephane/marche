import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import { color, EASE_IN_OUT, fcfa, fontFamily, pressScale, progress } from "../brand/theme";
import { BOUBOU, CHEMISE, PAGNE, ROBE, STORE, type DemoProduct } from "../data";
import { Cursor, Led, Phone, Ripple } from "../ui/parts";
import { Swatch } from "../ui/Swatch";
import { Backdrop } from "./Backdrop";

type PublishProps = {
  readonly title: string;
  readonly lede: string;
  readonly button: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

const CLICK = 52;
const PHONE_AT = 64;

const Card: React.FC<{ readonly product: DemoProduct; readonly frame: number; readonly delay: number }> = ({
  product,
  frame,
  delay,
}) => {
  const enter = progress(frame, delay, 20);
  return (
    <div style={{ opacity: enter, translate: `0 ${(1 - enter) * 30}px` }}>
      <Swatch wax={product.wax} width={236} height={260} radius={22} scale={2.2} />
      <div style={{ fontSize: 25, fontWeight: 600, marginTop: 14, color: "#101115" }}>{product.name}</div>
      <div style={{ fontSize: 25, color: "#4a4c54", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
        {fcfa(product.price)}
      </div>
    </div>
  );
};

/** Le site de la boutique, tel que l'acheteur le voit sur son téléphone. */
const Storefront: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <div style={{ padding: "84px 26px 0", color: "#101115" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px" }}>
      <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>{STORE.name}</span>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#101115" strokeWidth={1.8}>
        <path d="M5 8h14l-1.2 12H6.2Z" strokeLinejoin="round" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
    </div>
    <div style={{ position: "relative", marginTop: 26, opacity: progress(frame, PHONE_AT + 22, 18) }}>
      <Swatch wax="cercles" width={500} height={300} radius={30} scale={2.4} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 30,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          color: "#f4f2ee",
          background: "linear-gradient(180deg, transparent 35%, rgba(0, 0, 0, 0.55))",
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 500, opacity: 0.85 }}>Nouvelle collection</span>
        <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>Wax &amp; bazin</span>
      </div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, margin: "30px 6px 18px" }}>Nouveautés</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px 28px" }}>
      <Card product={ROBE} frame={frame} delay={PHONE_AT + 30} />
      <Card product={PAGNE} frame={frame} delay={PHONE_AT + 35} />
      <Card product={BOUBOU} frame={frame} delay={PHONE_AT + 40} />
      <Card product={CHEMISE} frame={frame} delay={PHONE_AT + 45} />
    </div>
  </div>
);

/** « Générer mon site » : un clic, et la boutique apparaît sur le téléphone. */
const PublishInner: React.FC<PublishProps> = ({ title, lede, button, backdrop, style }) => {
  const frame = useCurrentFrame();
  const approach = progress(frame, 22, 26, Easing.bezier(0.33, 1, 0.68, 1));
  const away = progress(frame, CLICK + 10, 18, EASE_IN_OUT);
  const rise = progress(frame, PHONE_AT, 34);
  const live = progress(frame, PHONE_AT + 40, 16);
  const pulse = 0.55 + 0.45 * Math.sin((frame - PHONE_AT) / 6);

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
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", top: 1060, height: 140 }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 20,
            height: 140,
            padding: "0 64px",
            borderRadius: 140,
            backgroundColor: color.orange,
            color: "#101115",
            fontSize: 52,
            fontWeight: 650,
            letterSpacing: "-0.01em",
            boxShadow: "0 24px 60px rgba(246, 107, 33, 0.35)",
            opacity: progress(frame, 16, 18) * (1 - away),
            scale: pressScale(frame, CLICK) * (1 - 0.12 * away),
            translate: `0 ${(1 - progress(frame, 16, 24)) * 50 - away * 260}px`,
          }}
        >
          {button}
          <Ripple frame={frame} at={CLICK} size={320} />
          <Cursor
            press={interpolate(frame, [CLICK - 3, CLICK, CLICK + 6], [0, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            style={{
              left: "74%",
              top: "58%",
              opacity: interpolate(frame, [22, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: `${(1 - approach) * 360}px ${(1 - approach) * 520}px`,
            }}
          />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", top: 600 }}>
        <div style={{ position: "relative", translate: `0 ${(1 - rise) * 1400}px` }}>
          <Phone width={580} height={1220} screen="#ffffff">
            <Storefront frame={frame} />
          </Phone>
          <div
            style={{
              position: "absolute",
              top: 56,
              right: -50,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 30px",
              borderRadius: 60,
              backgroundColor: "#16171b",
              border: `2px solid ${color.line2}`,
              fontSize: 36,
              fontWeight: 600,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)",
              opacity: live,
              scale: 0.9 + 0.1 * live,
            }}
          >
            <Led tone="orange" size={18} glow={pulse} />
            En ligne
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const publishSchema = {
  title: { type: "text-content", default: "", description: "Titre" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  button: { type: "text-content", default: "Générer mon site", description: "Bouton" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const PublishScene = Interactive.withSchema({
  Component: PublishInner,
  componentName: "<PublishScene>",
  schema: publishSchema,
  wrapInSequence: true,
});
