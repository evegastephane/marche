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
import { ROBE, SAC, STORE, type DemoProduct } from "../data";
import { Led, Sheet } from "../ui/parts";
import { Swatch } from "../ui/Swatch";
import { Backdrop } from "./Backdrop";

type CounterProps = {
  readonly title: string;
  readonly lede: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

const SCAN_1 = 26;
const SCAN_2 = 44;
const PAY_AT = 66;
const CASH_AT = 84;
const PRINT_AT = 94;

const Line: React.FC<{ readonly product: DemoProduct; readonly frame: number; readonly at: number }> = ({
  product,
  frame,
  at,
}) => {
  const enter = progress(frame, at, 18);
  const flash = interpolate(frame, [at, at + 4, at + 20], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "14px 18px",
        borderRadius: 22,
        backgroundColor: `rgba(16, 17, 21, ${0.06 * flash})`,
        opacity: enter,
        translate: `${(1 - enter) * -40}px 0`,
      }}
    >
      <Swatch wax={product.wax} width={76} radius={16} />
      <span style={{ flex: 1, fontSize: 36, fontWeight: 600 }}>
        {product.name} <span style={{ color: color.paperInk3, fontWeight: 500 }}>× 1</span>
      </span>
      <span style={{ fontSize: 36, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {fcfa(product.price)}
      </span>
    </div>
  );
};

const PayChoice: React.FC<{ readonly label: string; readonly selected: number }> = ({ label, selected }) => (
  <div
    style={{
      flex: 1,
      height: 92,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 26,
      fontSize: 34,
      fontWeight: 600,
      border: `2px solid ${selected > 0.5 ? "#101115" : color.paperLine2}`,
      backgroundColor: `rgba(16, 17, 21, ${selected})`,
      color: selected > 0.5 ? color.ink : color.paperInk,
    }}
  >
    {label}
  </div>
);

/** Le ticket imprimé, bord inférieur dentelé. */
const Ticket: React.FC<{ readonly total: number }> = ({ total }) => {
  const dashed = { borderTop: "3px dashed rgba(16, 17, 21, 0.22)", margin: "22px 0" };
  const row = { display: "flex", justifyContent: "space-between", fontSize: 32 } as const;
  return (
    <div
      style={{
        width: 680,
        padding: "44px 50px 64px",
        backgroundColor: "#fffdf8",
        color: "#101115",
        fontVariantNumeric: "tabular-nums",
        boxShadow: "0 30px 60px rgba(16, 17, 21, 0.18)",
        maskImage:
          "linear-gradient(#000, #000), conic-gradient(from -45deg at 50% 100%, #000 90deg, transparent 0)",
        maskSize: "100% calc(100% - 20px), 40px 20px",
        maskPosition: "top, bottom",
        maskRepeat: "no-repeat, repeat-x",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 40, fontWeight: 800, letterSpacing: "0.12em" }}>
        {STORE.name.toUpperCase()}
      </div>
      <div style={{ textAlign: "center", fontSize: 26, color: color.paperInk3, marginTop: 6 }}>
        {STORE.city} · Ticket n° 1044
      </div>
      <div style={dashed} />
      <div style={row}>
        <span>{ROBE.name} × 1</span>
        <span>{fcfa(ROBE.price)}</span>
      </div>
      <div style={{ ...row, marginTop: 10 }}>
        <span>{SAC.name} × 1</span>
        <span>{fcfa(SAC.price)}</span>
      </div>
      <div style={dashed} />
      <div style={{ ...row, fontSize: 38, fontWeight: 800 }}>
        <span>TOTAL</span>
        <span>{fcfa(total)}</span>
      </div>
      <div style={{ ...row, marginTop: 10, color: color.paperInk2 }}>
        <span>Mobile Money</span>
        <span>{fcfa(total)}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: 26, color: color.paperInk3, marginTop: 30 }}>
        Merci de votre visite
      </div>
    </div>
  );
};

/** La caisse : deux articles scannés, Mobile Money, et le ticket sort de l'imprimante. */
const CounterInner: React.FC<CounterProps> = ({ title, lede, backdrop, style }) => {
  const frame = useCurrentFrame();
  const total =
    ROBE.price * progress(frame, SCAN_1, 14) + SAC.price * progress(frame, SCAN_2, 14);
  const pay = progress(frame, PAY_AT, 10);
  const print = progress(frame, PRINT_AT, 46, EASE_IN_OUT);

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

        <Interactive.Div
          name="Caisse"
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 64,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: 32,
            borderRadius: 40,
            backgroundColor: "#f4f3ef",
            border: "2px solid rgba(16, 17, 21, 0.08)",
            opacity: interpolate(frame, [16, 34], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 600, padding: "0 6px" }}>
            <Led tone="ink" size={14} />
            Caisse ouverte
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Line product={ROBE} frame={frame} at={SCAN_1} />
            <Line product={SAC} frame={frame} at={SCAN_2} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "16px 6px 4px",
              borderTop: "2px solid rgba(16, 17, 21, 0.1)",
            }}
          >
            <span style={{ fontSize: 36, color: color.paperInk2 }}>Total</span>
            <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              {fcfa(total)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <PayChoice label="Espèces" selected={0} />
            <PayChoice label="Mobile Money" selected={pay} />
          </div>
          <div
            style={{
              height: 112,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 30,
              backgroundColor: color.orange,
              color: "#101115",
              fontSize: 40,
              fontWeight: 650,
              scale: pressScale(frame, CASH_AT),
            }}
          >
            Encaisser
          </div>
        </Interactive.Div>

        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginTop: -6 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              width: 740,
              height: 14,
              borderRadius: 14,
              backgroundColor: "#101115",
              zIndex: 2,
              opacity: progress(frame, PRINT_AT - 10, 10),
            }}
          />
          <div style={{ overflow: "hidden", paddingTop: 7, paddingBottom: 80, paddingInline: 40 }}>
            <div style={{ translate: `0 ${(print - 1) * 102}%` }}>
              <Ticket total={ROBE.price + SAC.price} />
            </div>
          </div>
        </div>
      </Sheet>
    </AbsoluteFill>
  );
};

const counterSchema = {
  title: { type: "text-content", default: "", description: "Titre" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const CounterScene = Interactive.withSchema({
  Component: CounterInner,
  componentName: "<CounterScene>",
  schema: counterSchema,
  wrapInSequence: true,
});
