import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import { color, fcfa, fontFamily, progress } from "../brand/theme";
import { BAZIN, BOUBOU, CHEMISE, PAGNE, ROBE, SAC, STORE, type DemoProduct } from "../data";
import { Led, Roll, Sheet } from "../ui/parts";
import { Swatch } from "../ui/Swatch";
import { Backdrop } from "./Backdrop";

type ManageProps = {
  readonly title: string;
  readonly lede: string;
  readonly backdrop: boolean;
  readonly style?: React.CSSProperties;
};

const ORDER_AT = 96;
const STOCK_AT = 112;

const Row: React.FC<{
  readonly product: DemoProduct;
  readonly frame: number;
  readonly delay: number;
  readonly stock: React.ReactNode;
  readonly low?: boolean;
  readonly highlight?: number;
}> = ({ product, frame, delay, stock, low = false, highlight = 0 }) => {
  const enter = progress(frame, delay, 22);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "28px 34px",
        borderTop: `2px solid ${color.paperLine}`,
        backgroundColor: `rgba(16, 17, 21, ${0.05 * highlight})`,
        opacity: enter,
        translate: `0 ${(1 - enter) * 40}px`,
      }}
    >
      <Swatch wax={product.wax} width={124} radius={26} scale={1.2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.01em" }}>{product.name}</div>
        <div style={{ fontSize: 31, color: color.paperInk3, marginTop: 4 }}>
          {product.variant} · {product.sku}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 40, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {fcfa(product.price)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 6,
            fontSize: 32,
            color: color.paperInk2,
          }}
        >
          <Led tone={low ? "orange" : "ink"} size={14} />
          {stock}
          <span>en stock</span>
        </div>
      </div>
    </div>
  );
};

/** Le dashboard : les produits arrivent, une commande tombe, le stock se met à jour tout seul. */
const ManageInner: React.FC<ManageProps> = ({ title, lede, backdrop, style }) => {
  const frame = useCurrentFrame();
  const toast = progress(frame, ORDER_AT, 20);
  const highlight = interpolate(frame, [ORDER_AT + 6, ORDER_AT + 16, 150, 166], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          name="Produits"
          style={{
            position: "relative",
            marginTop: 72,
            borderRadius: 36,
            border: "2px solid rgba(16, 17, 21, 0.1)",
            backgroundColor: "#fbfaf8",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "30px 34px",
              fontSize: 38,
              fontWeight: 600,
              opacity: progress(frame, 24, 18),
            }}
          >
            <span>Produits</span>
            <span style={{ fontSize: 30, fontWeight: 500, color: color.paperInk3 }}>
              {STORE.name} · {STORE.city}
            </span>
          </div>
          <Row product={ROBE} frame={frame} delay={30} stock={ROBE.stock} />
          <Row
            product={PAGNE}
            frame={frame}
            delay={35}
            highlight={highlight}
            stock={
              <Roll
                frame={frame}
                values={[PAGNE.stock, PAGNE.stock - 2]}
                at={[STOCK_AT]}
                style={{ fontWeight: 700, color: color.paperInk }}
              />
            }
          />
          <Row product={BOUBOU} frame={frame} delay={40} stock={BOUBOU.stock} low />
          <Row product={SAC} frame={frame} delay={45} stock={SAC.stock} />
          <Row product={CHEMISE} frame={frame} delay={50} stock={CHEMISE.stock} />
          <Row product={BAZIN} frame={frame} delay={55} stock={BAZIN.stock} />
        </Interactive.Div>
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            top: 452,
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "26px 34px",
            borderRadius: 30,
            backgroundColor: "#101115",
            color: color.ink,
            boxShadow: "0 30px 60px rgba(16, 17, 21, 0.28)",
            opacity: toast,
            translate: `0 ${(1 - toast) * -60}px`,
            scale: 0.96 + 0.04 * toast,
          }}
        >
          <Led tone="paper" size={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 600 }}>Nouvelle commande #1043</div>
            <div style={{ fontSize: 30, color: color.ink2, marginTop: 4 }}>
              {PAGNE.name} × 2 · Site
            </div>
          </div>
          <div style={{ fontSize: 36, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {fcfa(PAGNE.price * 2)}
          </div>
        </div>
      </Sheet>
    </AbsoluteFill>
  );
};

const manageSchema = {
  title: { type: "text-content", default: "", description: "Titre" },
  lede: { type: "text-content", default: "", description: "Accroche" },
  backdrop: { type: "boolean", default: false, description: "Fond animé (aperçu de la scène seule)" },
} as const satisfies InteractivitySchema;

export const ManageScene = Interactive.withSchema({
  Component: ManageInner,
  componentName: "<ManageScene>",
  schema: manageSchema,
  wrapInSequence: true,
});
