import type { Wax } from "./ui/Swatch";

/* Boutique d'exemple « Chez Awa » (Dakar, FCFA), reprise de l'accueil : données synthétiques. */
export type DemoProduct = {
  readonly name: string;
  readonly variant: string;
  readonly sku: string;
  readonly price: number;
  readonly stock: number;
  readonly wax: Wax;
};

export const STORE = { name: "Chez Awa", city: "Dakar" };

export const ROBE: DemoProduct = {
  name: "Robe wax Ndeye",
  variant: "Taille M",
  sku: "RW-NDY-M",
  price: 18000,
  stock: 7,
  wax: "cercles",
};
export const PAGNE: DemoProduct = {
  name: "Pagne wax Feuilles",
  variant: "6 yards",
  sku: "PW-FEU-6",
  price: 15000,
  stock: 12,
  wax: "feuilles",
};
export const BOUBOU: DemoProduct = {
  name: "Boubou brodé",
  variant: "Taille L",
  sku: "BB-BRO-L",
  price: 35000,
  stock: 2,
  wax: "losanges",
};
export const SAC: DemoProduct = {
  name: "Sac en raphia",
  variant: "Naturel",
  sku: "SR-NAT",
  price: 12500,
  stock: 5,
  wax: "raphia",
};
export const BAZIN: DemoProduct = {
  name: "Bazin riche indigo",
  variant: "5 mètres",
  sku: "BZ-IND-5",
  price: 28000,
  stock: 4,
  wax: "bazin",
};
export const CHEMISE: DemoProduct = {
  name: "Chemise wax Bandes",
  variant: "Taille L",
  sku: "CW-BAN-L",
  price: 16500,
  stock: 9,
  wax: "bandes",
};
