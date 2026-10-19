/*
 * Tissus des produits d'exemple, dessinés en motifs géométriques (pagnes wax, raphia) : ils tiennent lieu de
 * photos dans les démonstrations. Les définitions sont posées une fois dans la page ; chaque vignette y renvoie.
 */

export type Wax = 'cercles' | 'feuilles' | 'losanges' | 'raphia';

export function WaxDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <pattern
          id="wax-cercles"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <rect width="28" height="28" fill="#1d3b6f" />
          <circle cx="14" cy="14" r="10.5" fill="#e0662a" />
          <circle cx="14" cy="14" r="7" fill="#f4e6cf" />
          <circle cx="14" cy="14" r="3.6" fill="#1d3b6f" />
          <circle cx="0" cy="0" r="2" fill="#f4e6cf" />
          <circle cx="28" cy="0" r="2" fill="#f4e6cf" />
          <circle cx="0" cy="28" r="2" fill="#f4e6cf" />
          <circle cx="28" cy="28" r="2" fill="#f4e6cf" />
        </pattern>
        <pattern
          id="wax-feuilles"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <rect width="32" height="32" fill="#2f6b4f" />
          <ellipse
            cx="9"
            cy="9"
            rx="8.5"
            ry="3.4"
            fill="#d9a441"
            transform="rotate(45 9 9)"
          />
          <ellipse
            cx="25"
            cy="25"
            rx="8.5"
            ry="3.4"
            fill="#f2e3c6"
            transform="rotate(-45 25 25)"
          />
          <path d="M3 3 15 15M19 31 31 19" stroke="#1f4a36" strokeWidth="1" />
          <circle cx="25" cy="8" r="2.2" fill="#d9a441" />
          <circle cx="8" cy="25" r="2.2" fill="#f2e3c6" />
        </pattern>
        <pattern
          id="wax-losanges"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <rect width="24" height="24" fill="#b8492a" />
          <path d="M12 2 22 12 12 22 2 12Z" fill="#f2e3c6" />
          <path d="M12 7 17 12 12 17 7 12Z" fill="#1b1a17" />
          <path d="M0 0 4 0 0 4ZM24 24 20 24 24 20Z" fill="#e7b04a" />
        </pattern>
        <pattern
          id="wax-raphia"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <rect width="10" height="10" fill="#c9a05a" />
          <path d="M0 2.5H10M0 7.5H10" stroke="#b08a45" strokeWidth="2.2" />
          <path d="M2.5 0V10M7.5 0V10" stroke="#e0bd78" strokeWidth="1.4" />
        </pattern>
        <linearGradient id="wax-drape" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.34" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Vignette d'un produit d'exemple : le tissu, avec un drapé de lumière. */
export function Swatch({
  wax,
  className,
  radius = 10,
}: {
  wax: Wax;
  className?: string;
  radius?: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <rect width="100" height="100" rx={radius} fill={`url(#wax-${wax})`} />
      <rect width="100" height="100" rx={radius} fill="url(#wax-drape)" />
    </svg>
  );
}

/** Produits de la boutique d'exemple « Chez Awa » (données synthétiques, en FCFA). */
export const DEMO_PRODUCTS = [
  {
    name: 'Robe wax Ndeye',
    price: '18 000',
    note: 'S · M · L',
    wax: 'cercles',
  },
  {
    name: 'Pagne wax Feuilles',
    price: '15 000',
    note: '6 yards',
    wax: 'feuilles',
  },
  {
    name: 'Boubou brodé',
    price: '35 000',
    note: 'Plus que 2',
    wax: 'losanges',
  },
  { name: 'Sac en raphia', price: '12 500', note: 'En stock', wax: 'raphia' },
] as const satisfies readonly {
  name: string;
  price: string;
  note: string;
  wax: Wax;
}[];
