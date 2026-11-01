import type { ReactNode } from "react";

/* Built-in artworks and gift items, drawn as simple inline SVG on a 100 × 100 box. */

const c = {
  apricot: "oklch(0.78 0.13 55)",
  rust: "oklch(0.6 0.16 40)",
  cream: "oklch(0.95 0.03 85)",
  navy: "oklch(0.3 0.07 265)",
  ink: "oklch(0.2 0.02 265)",
  rose: "oklch(0.72 0.13 10)",
  sky: "oklch(0.75 0.09 230)",
  sage: "oklch(0.7 0.09 150)",
  leaf: "oklch(0.52 0.1 150)",
  gold: "oklch(0.8 0.13 85)",
  berry: "oklch(0.52 0.18 25)",
  sun: "oklch(0.86 0.15 90)",
  white: "oklch(0.98 0 0)",
  choc: "oklch(0.36 0.06 50)",
  wood: "oklch(0.66 0.09 65)",
  straw: "oklch(0.8 0.1 85)",
};

/** Repeat an element around the centre (50, 50). */
const ring = (n: number, el: (i: number) => ReactNode, offset = 0) =>
  Array.from({ length: n }, (_, i) => (
    <g key={i} transform={`rotate(${offset + (360 / n) * i} 50 50)`}>
      {el(i)}
    </g>
  ));

const STAR = "50,8 61,38 94,38 67,58 77,90 50,70 23,90 33,58 6,38 39,38";
const HEART = "M50 86C20 64 8 46 8 32a20 20 0 0 1 42-8 20 20 0 0 1 42 8c0 14-12 32-42 54Z";

export const ART = {
  /* ---------- artworks ---------- */
  floral: {
    name: "Floral wreath",
    svg: (
      <>
        {ring(12, (i) => <ellipse cx="50" cy="16" rx="6" ry="12" fill={i % 2 ? c.leaf : c.sage} />)}
        {ring(4, () => <circle cx="50" cy="15" r="5.5" fill={c.apricot} />)}
        {ring(4, () => (
          <>
            <circle cx="50" cy="15" r="8" fill={c.rose} />
            <circle cx="50" cy="15" r="3" fill={c.sun} />
          </>
        ), 45)}
      </>
    ),
  },
  bestMom: {
    name: "Best Mom",
    svg: (
      <>
        <path d="M50 34c-4-7-15-4-13 4 2 6 13 11 13 11s11-5 13-11c2-8-9-11-13-4Z" fill={c.rose} />
        <text x="50" y="70" textAnchor="middle" fontFamily="'Dancing Script', cursive" fontWeight="700" fontSize="25" fill={c.rust}>
          Best Mom
        </text>
        <path d="M24 80h52" stroke={c.apricot} strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  mountains: {
    name: "Mountains",
    svg: (
      <>
        <g fill="none" stroke={c.navy} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M8 76 32 40l14 20 16-28 30 44Z" />
          <path d="M26 49l6 5 5-6M56 41l6 6 6-7" />
          <path d="M8 85h84" />
        </g>
        <circle cx="76" cy="22" r="7" fill="none" stroke={c.apricot} strokeWidth="3.5" />
      </>
    ),
  },
  coffee: {
    name: "Coffee doodle",
    svg: (
      <g stroke={c.choc} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 42h42v20a18 18 0 0 1-18 18h-6a18 18 0 0 1-18-18Z" fill={c.cream} />
        <path d="M66 48h5a8 8 0 0 1 0 16h-5" fill="none" />
        <path d="M36 32c0-6 6-6 6-12M48 32c0-6 6-6 6-12" fill="none" />
        <path d="M18 88h56" fill="none" />
      </g>
    ),
  },
  sunrise: {
    name: "Sunrise",
    svg: (
      <>
        <circle cx="50" cy="62" r="24" fill={c.apricot} />
        {[-60, -30, 0, 30, 60].map((a) => (
          <rect key={a} x="48.5" y="20" width="3" height="11" rx="1.5" fill={c.apricot} transform={`rotate(${a} 50 62)`} />
        ))}
        <rect x="0" y="62" width="100" height="38" fill={c.navy} />
        <path d="M14 72h30M56 72h30M26 82h48M40 92h20" stroke={c.sky} strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  waves: {
    name: "Waves",
    svg: (
      <>
        <rect width="100" height="100" fill={c.navy} />
        {[12, 30, 48, 66, 84].map((y, i) => (
          <path key={y} d={`M-5 ${y} q13.75 -9 27.5 0 t27.5 0 t27.5 0 t27.5 0`} fill="none" stroke={i % 2 ? c.sky : c.cream} strokeWidth="4" strokeLinecap="round" />
        ))}
      </>
    ),
  },
  leaves: {
    name: "Botanical",
    svg: (
      <>
        <path d="M50 94V14" stroke={c.leaf} strokeWidth="3" strokeLinecap="round" />
        {[
          [26, -38],
          [38, 38],
          [52, -38],
          [64, 38],
          [78, -38],
        ].map(([y, a], i) => (
          <ellipse key={y} cx="50" cy={y} rx="7" ry="16" fill={i % 2 ? c.sage : c.leaf} transform={`rotate(${a} 50 ${y + 12}) translate(${a > 0 ? 9 : -9} 0)`} />
        ))}
      </>
    ),
  },
  nightStars: {
    name: "Night sky",
    svg: (
      <>
        <rect width="100" height="100" fill={c.ink} />
        <circle cx="68" cy="34" r="17" fill={c.cream} />
        <circle cx="61" cy="28" r="15" fill={c.ink} />
        {[
          [18, 20],
          [34, 62],
          [82, 76],
          [14, 84],
          [48, 42],
          [88, 16],
          [58, 88],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={c.sun} />
        ))}
      </>
    ),
  },
  star: { name: "Star", svg: <polygon points={STAR} fill={c.gold} /> },
  heart: { name: "Heart", svg: <path d={HEART} fill={c.rose} /> },
  bolt: { name: "Lightning", svg: <path d="M58 6 20 56h26l-8 38 42-54H54Z" fill={c.sun} /> },
  smiley: {
    name: "Smiley",
    svg: (
      <>
        <circle cx="50" cy="50" r="40" fill={c.sun} />
        <circle cx="36" cy="42" r="5" fill={c.ink} />
        <circle cx="64" cy="42" r="5" fill={c.ink} />
        <path d="M32 60q18 18 36 0" fill="none" stroke={c.ink} strokeWidth="5" strokeLinecap="round" />
      </>
    ),
  },
  monogram: {
    name: "Monogram",
    svg: (
      <>
        <circle cx="50" cy="50" r="42" fill={c.ink} />
        <circle cx="50" cy="50" r="35" fill="none" stroke={c.gold} strokeWidth="2" />
        <text x="50" y="62" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="800" fontSize="32" fill={c.gold}>
          HC
        </text>
      </>
    ),
  },
  crest: {
    name: "Crest",
    svg: (
      <>
        <path d="M50 8 86 20v28c0 22-16 36-36 44C30 84 14 70 14 48V20Z" fill={c.navy} stroke={c.gold} strokeWidth="3" />
        <polygon points="50,30 55,43 69,44 58,52 62,66 50,58 38,66 42,52 31,44 45,43" fill={c.gold} />
      </>
    ),
  },
  waveBadge: {
    name: "Wave badge",
    svg: (
      <>
        <circle cx="50" cy="50" r="40" fill={c.sky} />
        <circle cx="50" cy="36" r="10" fill={c.apricot} />
        <path d="M10.5 56q9.9-8 19.8 0t19.8 0 19.8 0 19.6 0A40 40 0 0 1 10.5 56Z" fill={c.navy} />
      </>
    ),
  },
  goodVibes: {
    name: "Good Vibes",
    svg: (
      <g textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="26" fill={c.apricot} stroke={c.rust} strokeWidth="1">
        <text x="50" y="46">GOOD</text>
        <text x="50" y="74">VIBES</text>
      </g>
    ),
  },
  stayWild: {
    name: "Stay Wild",
    svg: (
      <g textAnchor="middle">
        <text x="50" y="44" fontFamily="'Dancing Script', cursive" fontWeight="700" fontSize="28" fill={c.rose}>
          Stay
        </text>
        <text x="50" y="76" fontFamily="Fraunces, serif" fontWeight="800" fontSize="28" letterSpacing="2" fill={c.sage}>
          WILD
        </text>
      </g>
    ),
  },
  est2026: {
    name: "Est. 2026",
    svg: (
      <g fill="none" stroke={c.gold}>
        <circle cx="50" cy="50" r="40" strokeWidth="3" />
        <circle cx="50" cy="50" r="33" strokeWidth="1" />
        <g fill={c.gold} stroke="none" textAnchor="middle">
          <text x="50" y="44" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="11" letterSpacing="3">
            EST.
          </text>
          <text x="50" y="66" fontFamily="Fraunces, serif" fontWeight="800" fontSize="22">
            2026
          </text>
        </g>
      </g>
    ),
  },
  arch: {
    name: "Sunset arch",
    svg: (
      <>
        <rect width="100" height="100" fill={c.ink} />
        <circle cx="64" cy="28" r="14" fill={c.berry} />
        {[32, 24, 16].map((r) => (
          <path key={r} d={`M${50 - r} 100V68a${r} ${r} 0 0 1 ${2 * r} 0V100`} fill="none" stroke={c.cream} strokeWidth="3" />
        ))}
      </>
    ),
  },
  blobs: {
    name: "Apricot blobs",
    svg: (
      <>
        <rect width="100" height="100" fill={c.apricot} />
        <path d="M-5 30c20-10 30 10 50 0s30-20 60-5v20c-20 10-40-5-60 5S5 60-5 50Z" fill={c.cream} />
        <path d="M-5 78c25-12 35 8 55 0s30-15 55 0v30H-5Z" fill={c.cream} />
      </>
    ),
  },
  flowers: {
    name: "White flowers",
    svg: (
      <>
        <rect width="100" height="100" fill={c.leaf} />
        {[
          [26, 28],
          [74, 40],
          [36, 76],
          [82, 86],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-9" rx="7" ry="10" fill={c.cream} transform={`rotate(${a})`} />
            ))}
            <circle r="4" fill={c.ink} />
          </g>
        ))}
      </>
    ),
  },
  checker: {
    name: "Checker",
    svg: (
      <>
        <rect width="100" height="100" fill={c.cream} />
        {Array.from({ length: 25 }, (_, i) => {
          const x = i % 5;
          const y = Math.floor(i / 5);
          return (x + y) % 2 ? <rect key={i} x={x * 20} y={y * 20} width="20" height="20" fill={c.rust} /> : null;
        })}
      </>
    ),
  },
  stripes: {
    name: "Stripes",
    svg: (
      <>
        <rect width="100" height="100" fill={c.navy} />
        {[-80, -40, 0, 40, 80].map((o) => (
          <path key={o} d={`M${o} 0l100 100`} stroke={c.apricot} strokeWidth="12" />
        ))}
      </>
    ),
  },
  rainbow: {
    name: "Rainbow",
    svg: (
      <>
        {(
          [
            [38, c.berry],
            [31, c.apricot],
            [24, c.sun],
            [17, c.sage],
            [10, c.sky],
          ] as const
        ).map(([r, col]) => (
          <path key={r} d={`M${50 - r} 72a${r} ${r} 0 0 1 ${2 * r} 0`} fill="none" stroke={col} strokeWidth="7" />
        ))}
        <circle cx="16" cy="74" r="9" fill={c.white} />
        <circle cx="84" cy="74" r="9" fill={c.white} />
      </>
    ),
  },
  mushroom: {
    name: "Mushroom",
    svg: (
      <>
        <path d="M38 52h24l5 36H33Z" fill={c.cream} />
        <path d="M12 54a38 34 0 0 1 76 0Z" fill={c.berry} />
        <circle cx="32" cy="38" r="5" fill={c.cream} />
        <circle cx="54" cy="30" r="6" fill={c.cream} />
        <circle cx="72" cy="44" r="4" fill={c.cream} />
      </>
    ),
  },
  sunSmile: {
    name: "Sunny smile",
    svg: (
      <>
        {ring(12, () => <rect x="47" y="4" width="6" height="14" rx="3" fill={c.sun} />)}
        <circle cx="50" cy="50" r="28" fill={c.sun} />
        <circle cx="41" cy="45" r="3.5" fill={c.ink} />
        <circle cx="59" cy="45" r="3.5" fill={c.ink} />
        <path d="M40 57q10 10 20 0" fill="none" stroke={c.ink} strokeWidth="3.5" strokeLinecap="round" />
      </>
    ),
  },
  daisy: {
    name: "Daisy",
    svg: (
      <>
        {ring(12, () => <ellipse cx="50" cy="25" rx="8" ry="18" fill={c.white} />)}
        <circle cx="50" cy="50" r="13" fill={c.sun} />
      </>
    ),
  },

  /* ---------- gift items ---------- */
  candle: {
    name: "Candle",
    svg: (
      <>
        <rect x="28" y="36" width="44" height="54" rx="6" fill={c.ink} />
        <rect x="28" y="52" width="44" height="18" fill={c.cream} />
        <path d="M50 36v-8" stroke={c.ink} strokeWidth="2" />
        <path d="M50 8c7 9 7 15 0 20-7-5-7-11 0-20Z" fill={c.apricot} />
      </>
    ),
  },
  miniMug: {
    name: "Mini mug",
    svg: (
      <>
        <path d="M66 42h6a10 10 0 0 1 0 20h-6" fill="none" stroke={c.cream} strokeWidth="6" />
        <path d="M22 30h44v44a12 12 0 0 1-12 12H34a12 12 0 0 1-12-12Z" fill={c.cream} />
        <path d="M44 66c-2-4-8-2-7 2 1 3 7 6 7 6s6-3 7-6c1-4-5-6-7-2Z" fill={c.rose} />
      </>
    ),
  },
  chocolate: {
    name: "Chocolate bar",
    svg: (
      <>
        <rect x="24" y="10" width="52" height="80" rx="4" fill={c.choc} />
        <path d="M24 28h52M24 46h52M50 10v40" stroke="oklch(0.28 0.05 50)" strokeWidth="2" />
        <rect x="24" y="56" width="52" height="34" rx="3" fill={c.gold} />
        <path d="M24 56l52 0-6 6H30Z" fill="oklch(0.7 0.12 85)" />
      </>
    ),
  },
  cookies: {
    name: "Cookies",
    svg: (
      <>
        {[
          [38, 44, 26],
          [64, 64, 22],
        ].map(([x, y, r]) => (
          <g key={x}>
            <circle cx={x} cy={y} r={r} fill={c.wood} />
            {[
              [-8, -6],
              [6, -10],
              [9, 6],
              [-6, 9],
              [0, 0],
            ].map(([dx, dy]) => (
              <circle key={`${dx}${dy}`} cx={x + dx * (r / 26)} cy={y + dy * (r / 26)} r="3" fill={c.choc} />
            ))}
          </g>
        ))}
      </>
    ),
  },
  teddy: {
    name: "Teddy bear",
    svg: (
      <g fill={c.wood}>
        <ellipse cx="50" cy="72" rx="24" ry="22" />
        <circle cx="30" cy="20" r="10" />
        <circle cx="70" cy="20" r="10" />
        <circle cx="50" cy="38" r="22" />
        <ellipse cx="50" cy="45" rx="9" ry="7" fill={c.cream} />
        <circle cx="42" cy="34" r="3" fill={c.ink} />
        <circle cx="58" cy="34" r="3" fill={c.ink} />
        <circle cx="50" cy="43" r="3" fill={c.ink} />
        <circle cx="28" cy="84" r="8" />
        <circle cx="72" cy="84" r="8" />
      </g>
    ),
  },
  teaTin: {
    name: "Tea tin",
    svg: (
      <>
        <rect x="30" y="24" width="40" height="66" rx="4" fill={c.sage} />
        <rect x="27" y="16" width="46" height="12" rx="3" fill={c.leaf} />
        <rect x="35" y="46" width="30" height="22" rx="2" fill={c.cream} />
        <text x="50" y="62" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="800" fontSize="10" fill={c.leaf}>
          TEA
        </text>
      </>
    ),
  },
  bow: {
    name: "Ribbon bow",
    svg: (
      <g fill={c.rose}>
        <path d="M50 50C34 26 10 30 14 46s24 14 36 4Z" />
        <path d="M50 50c16-24 40-20 36-4s-24 14-36 4Z" />
        <path d="M46 52 32 88l10-4 6 8 2-40ZM54 52l14 36-10-4-6 8-2-40Z" fill={c.berry} />
        <circle cx="50" cy="50" r="7" fill={c.berry} />
      </g>
    ),
  },
  giftHeart: { name: "Heart", svg: <path d={HEART} fill={c.berry} /> },
  tag: {
    name: "Gift tag",
    svg: (
      <>
        <path d="M10 20c10 4 6 14 14 18" fill="none" stroke={c.gold} strokeWidth="2" />
        <path d="M24 32h40l24 22-24 22H24Z" fill={c.cream} transform="rotate(-12 50 54)" />
        <circle cx="34" cy="50" r="4" fill={c.ink} transform="rotate(-12 50 54)" />
        <path d="M44 60h28" stroke={c.rust} strokeWidth="3" strokeLinecap="round" transform="rotate(-12 50 54)" />
      </>
    ),
  },
  rose: {
    name: "Dried rose",
    svg: (
      <>
        <path d="M50 44c-2 18 2 32-4 48" fill="none" stroke={c.leaf} strokeWidth="3" />
        <ellipse cx="62" cy="68" rx="10" ry="5" fill={c.leaf} transform="rotate(-30 62 68)" />
        <circle cx="50" cy="30" r="18" fill={c.berry} />
        <path d="M42 28a8 8 0 0 1 16 0 6 6 0 0 1-10 4" fill="none" stroke="oklch(0.38 0.14 25)" strokeWidth="3" />
      </>
    ),
  },
  card: {
    name: "Message card",
    svg: (
      <>
        <rect x="18" y="24" width="64" height="52" rx="3" fill={c.cream} transform="rotate(-6 50 50)" />
        <path d="M24 34h40M24 44h30" stroke={c.wood} strokeWidth="2.5" strokeLinecap="round" transform="rotate(-6 50 50)" />
        <path d="M66 64c-2-4-8-2-7 2 1 3 7 6 7 6s6-3 7-6c1-4-5-6-7-2Z" fill={c.rose} />
      </>
    ),
  },
  shred: {
    name: "Paper shred",
    svg: (
      <g fill="none" strokeWidth="3" strokeLinecap="round">
        {[
          "M10 60q10-14 22 0t22 0",
          "M30 72q12-12 24 0t22 0",
          "M18 82q10-10 20 0t24-2",
          "M44 56q10-12 22 0t20 2",
          "M8 74q8-8 16 0",
          "M62 84q10-10 24 0",
          "M26 62q8-10 18-2",
        ].map((d, i) => (
          <path key={d} d={d} stroke={i % 2 ? c.wood : c.straw} />
        ))}
      </g>
    ),
  },
  nest: {
    name: "Straw nest",
    svg: (
      <>
        <ellipse cx="50" cy="66" rx="40" ry="18" fill={c.wood} />
        <ellipse cx="50" cy="60" rx="30" ry="10" fill="oklch(0.5 0.07 60)" />
        <g stroke={c.straw} strokeWidth="2" strokeLinecap="round">
          {[16, 28, 40, 52, 64, 76].map((x) => (
            <path key={x} d={`M${x} 70l${x < 50 ? 10 : -10} -14`} />
          ))}
        </g>
      </>
    ),
  },
  pouch: {
    name: "Linen pouch",
    svg: (
      <>
        <path d="M30 34h40l8 50a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6Z" fill={c.cream} />
        <path d="M30 34q20-10 40 0" fill="none" stroke={c.wood} strokeWidth="3" />
        <path d="M50 30c-6 10-14 12-18 22M50 30c6 10 14 12 18 22" fill="none" stroke={c.rust} strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  miniBox: {
    name: "Mini box",
    svg: (
      <>
        <rect x="20" y="34" width="60" height="52" rx="3" fill={c.navy} />
        <rect x="16" y="28" width="68" height="14" rx="3" fill={c.ink} />
        <path d="M50 28v58" stroke={c.gold} strokeWidth="6" />
        <path d="M50 28c-8-12-20-10-18-2s18 2 18 2 16 6 18-2-10-10-18 2Z" fill={c.gold} />
      </>
    ),
  },
} satisfies Record<string, { name: string; svg: ReactNode }>;

export type ArtId = keyof typeof ART;

export function Artwork({ id, className = "block h-full w-full" }: { id: ArtId; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {ART[id].svg}
    </svg>
  );
}
