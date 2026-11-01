import type { JewelryPiece } from "../../data/studioCatalog";

export interface Pt {
  x: number;
  y: number;
}

export interface Cord {
  kind: "circle" | "u";
  width: number;
  height: number;
  /** SVG path of the cord. */
  d: string;
  points: Pt[];
  /** Cumulative length at each point. */
  cum: number[];
  total: number;
  clasp?: Pt;
  label: Pt;
}

function cubic(p: Pt[], t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
}

const U_SEGMENTS: Pt[][] = [
  [{ x: 150, y: 26 }, { x: 96, y: 26 }, { x: 58, y: 58 }, { x: 56, y: 110 }],
  [{ x: 56, y: 110 }, { x: 54, y: 210 }, { x: 100, y: 292 }, { x: 150, y: 294 }],
  [{ x: 150, y: 294 }, { x: 200, y: 292 }, { x: 246, y: 210 }, { x: 244, y: 110 }],
  [{ x: 244, y: 110 }, { x: 242, y: 58 }, { x: 204, y: 26 }, { x: 150, y: 26 }],
];

const cache = new Map<string, Cord>();

/** The bracelet is a circle starting at the top; the necklace a U-shape with the clasp at the top. */
export function makeCord(kind: "circle" | "u"): Cord {
  const hit = cache.get(kind);
  if (hit) return hit;
  let points: Pt[];
  let cord: Omit<Cord, "points" | "cum" | "total">;
  if (kind === "circle") {
    const R = 110;
    points = Array.from({ length: 361 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 360) * Math.PI * 2;
      return { x: 150 + R * Math.cos(a), y: 150 + R * Math.sin(a) };
    });
    cord = { kind, width: 300, height: 300, d: `M150 ${150 - R}a${R} ${R} 0 1 1-.01 0Z`, label: { x: 150, y: 150 } };
  } else {
    points = U_SEGMENTS.flatMap((seg, i) => Array.from({ length: 80 }, (_, j) => cubic(seg, j / 80)).concat(i === 3 ? [seg[3]] : []));
    const d = `M150 26${U_SEGMENTS.map((s) => `C${s[1].x} ${s[1].y} ${s[2].x} ${s[2].y} ${s[3].x} ${s[3].y}`).join("")}`;
    cord = { kind, width: 300, height: 320, d, clasp: { x: 150, y: 26 }, label: { x: 150, y: 160 } };
  }
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const result = { ...cord, points, cum, total: cum[cum.length - 1] };
  cache.set(kind, result);
  return result;
}

export function pointAt(cord: Cord, s: number): Pt {
  const t = ((s % cord.total) + cord.total) % cord.total;
  let lo = 0;
  let hi = cord.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cord.cum[mid] < t) lo = mid;
    else hi = mid;
  }
  const seg = cord.cum[hi] - cord.cum[lo] || 1;
  const k = (t - cord.cum[lo]) / seg;
  const a = cord.points[lo];
  const b = cord.points[hi];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** Arc length of the cord point nearest to p. */
export function nearestS(cord: Cord, p: Pt) {
  let best = 0;
  let bestD = Infinity;
  cord.points.forEach((q, i) => {
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return cord.cum[best];
}

export interface PlacedPiece {
  index: number;
  piece: JewelryPiece;
  x: number;
  y: number;
  r: number;
  /** Arc length of the piece centre. */
  s: number;
}

/**
 * Pieces at real scale along the cord, in order. The whole cord equals the chosen length,
 * so a complete design fills it. Bracelets start at the top, necklaces are centred at the front.
 */
export function layoutPieces(cord: Cord, pieces: { index: number; piece: JewelryPiece }[], lengthMm: number): PlacedPiece[] {
  const k = cord.total / lengthMm;
  const used = pieces.reduce((n, p) => n + p.piece.lengthMm, 0) * k;
  let s = cord.kind === "circle" ? 0 : cord.total / 2 - used / 2;
  return pieces.map(({ index, piece }) => {
    const len = piece.lengthMm * k;
    const centre = s + len / 2;
    const p = pointAt(cord, centre);
    s += len;
    return { index, piece, x: p.x, y: p.y, r: len / 2, s: centre };
  });
}
