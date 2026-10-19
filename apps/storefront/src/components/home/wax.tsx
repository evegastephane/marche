import type { Wax } from './data';

/*
 * Tissus des produits d'exemple, dessinés en motifs géométriques (wax, bazin, raphia) : ils tiennent lieu de
 * photos dans les démonstrations. Les définitions sont posées une fois dans la page ; chaque vignette y renvoie.
 */
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
        <pattern
          id="wax-bazin"
          width="36"
          height="36"
          patternUnits="userSpaceOnUse"
        >
          <rect width="36" height="36" fill="#22305e" />
          <circle
            cx="18"
            cy="18"
            r="12"
            fill="none"
            stroke="#2c3d74"
            strokeWidth="3"
          />
          <circle cx="18" cy="18" r="5" fill="#2c3d74" />
          <circle
            cx="0"
            cy="0"
            r="6"
            fill="none"
            stroke="#2c3d74"
            strokeWidth="2"
          />
          <circle
            cx="36"
            cy="36"
            r="6"
            fill="none"
            stroke="#2c3d74"
            strokeWidth="2"
          />
        </pattern>
        <pattern
          id="wax-bandes"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <rect width="30" height="30" fill="#f1e4c8" />
          <rect width="30" height="7" fill="#c23a2b" />
          <rect y="11" width="30" height="3" fill="#1b1a17" />
          <rect y="18" width="30" height="8" fill="#2a6f5a" />
          <path
            d="M0 22H30"
            stroke="#e7b04a"
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
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
