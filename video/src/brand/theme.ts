import { loadFont } from "@remotion/google-fonts/HankenGrotesk";
import { Easing, interpolate, spring } from "remotion";

/* Police de la marque (PRODUCT.md) : Hanken Grotesk. */
export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

/* Couleurs de l'accueil « Le chariot en pièces » (apps/storefront/src/app/(platform)/home.css). */
export const color = {
  bg: "#0e0f12",
  raised: "#16171b",
  piece: "#1c1d23",
  ink: "#f4f2ee",
  ink2: "#aeb0b7",
  ink3: "#868891",
  line: "rgba(244, 242, 238, 0.1)",
  line2: "rgba(244, 242, 238, 0.18)",
  orange: "#f66b21",
  paper: "#ffffff",
  well: "#f4f3ef",
  paperInk: "#101115",
  paperInk2: "#4a4c54",
  paperInk3: "#686a72",
  paperLine: "rgba(16, 17, 21, 0.1)",
  paperLine2: "rgba(16, 17, 21, 0.18)",
} as const;

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** Avancement 0 → 1 entre `start` et `start + duration`. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE_OUT,
) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Ressort de « touche qui s'enfonce » : 0 avant `delay`, puis rebondit jusqu'à 1. */
export const pop = (frame: number, fps: number, delay: number) =>
  frame < delay
    ? 0
    : spring({
        frame: frame - delay,
        fps,
        config: { stiffness: 320, damping: 18, mass: 0.7 },
      });

/** Appui sur un bouton : 1 → 0.95 → 1 autour de `at`. */
export const pressScale = (frame: number, at: number) =>
  interpolate(frame, [at - 4, at, at + 8], [1, 0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

/** Montants en FCFA, sans décimales (PRODUCT.md). */
export const fcfa = (amount: number) => money.format(Math.round(amount));
