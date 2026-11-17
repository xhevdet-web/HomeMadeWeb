/**
 * Phone case template geometry: the one set of rules for the Case Studio canvas, its saved
 * preview PNG and the admin's template editor (an identical copy lives in the admin as
 * `src/views/cases/caseGeometry.js`; both are checked against the same expected paths).
 *
 * A template is stored as fractions (0–1) of its template image, never as screen pixels:
 *
 *   printAreas.front  = { x, y, width, height,           the printable area
 *                         radius?,                       one radius for all corners, or
 *                         radii?: { tl, tr, br, bl },    one per corner (wins over radius)
 *                         bleed?,                        how far artwork runs past the edge
 *                         safe?: { top, right, bottom, left } }  where important content stays
 *   printAreas.camera = { x, y, width, height, radius?, radii? }  never covered by artwork
 *
 * Radii, bleed and safe insets are fractions of the area's WIDTH, so every corner stays round
 * and every side gets the same physical distance on any screen. Templates saved before these
 * fields existed keep their look: radii fall back to radius, bleed is 0 and there is no safe
 * area.
 *
 * Rendering stacks: artwork → clipped to the printable shape → camera cut out → template
 * overlay → guides. A future custom (SVG) mask would replace `printableShape` / its path and
 * keep everything else.
 */

export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
/** A template area as stored, fractions of the template image. */
export interface CaseArea {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  radii?: Corners;
}
export interface CaseTemplate {
  area: CaseArea;
  camera: CaseArea | null;
  /** Fraction of the printable width that artwork extends past every edge; 0 = none. */
  bleed: number;
  /** Safe-area insets (fractions of the printable width), or null when not configured. */
  safe: Insets | null;
}

/**
 * A rounded rectangle in template fractions. Corner radii are per axis: `rx` in fractions of
 * the template width, `ry` of its height, so a round corner stays round on a tall template.
 */
export interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: Corners;
  ry: Corners;
}
/** Maps template fractions to output units: X = (x − x0) · sx. */
export interface Frame {
  x0: number;
  y0: number;
  sx: number;
  sy: number;
}
/** A rectangle in the printable area's own fractions (0–1 = the area; may run outside it). */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const MAX_BLEED = 0.1;
export const MAX_SAFE_INSET = 0.45;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const CORNER_KEYS = ["tl", "tr", "br", "bl"] as const;
const SIDE_KEYS = ["top", "right", "bottom", "left"] as const;

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const fraction = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

function parseFractions<K extends string>(value: unknown, keys: readonly K[], max: number): Record<K, number> | undefined {
  if (!isObject(value) || !keys.every((k) => fraction(value[k]))) return undefined;
  return Object.fromEntries(keys.map((k) => [k, Math.min(value[k] as number, max)])) as Record<K, number>;
}

/** A stored area, or null when it is missing or broken. Unknown fields are ignored. */
export function parseCaseArea(value: unknown): CaseArea | null {
  if (!isObject(value) || ![value.x, value.y, value.width, value.height].every(fraction)) return null;
  const { x, y, width, height } = value as unknown as CaseArea;
  if (width <= 0 || height <= 0) return null;
  const radii = parseFractions(value.radii, CORNER_KEYS, 0.5);
  return { x, y, width, height, radius: fraction(value.radius) ? Math.min(value.radius, 0.5) : 0, ...(radii ? { radii } : {}) };
}

/** A model's `printAreas` as a template; `fallback` stands in until the printable area is set. */
export function parseCaseTemplate(printAreas: unknown, fallback: CaseArea): CaseTemplate {
  const raw = isObject(printAreas) ? printAreas : {};
  const front = isObject(raw.front) ? raw.front : {};
  const area = parseCaseArea(raw.front);
  return {
    area: area ?? fallback,
    camera: parseCaseArea(raw.camera),
    bleed: area && fraction(front.bleed) ? Math.min(front.bleed, MAX_BLEED) : 0,
    safe: (area && parseFractions(front.safe, SIDE_KEYS, MAX_SAFE_INSET)) || null,
  };
}

/** Each corner's radius (fraction of the area width): `radii` when set, otherwise `radius` everywhere. */
export function cornersOf(a: CaseArea): Corners {
  if (a.radii) return a.radii;
  const r = a.radius ?? 0;
  return { tl: r, tr: r, br: r, bl: r };
}

/**
 * The area moved in by `inset` on each side (negative = out), as fractions of its width.
 * Corners follow the offset outline (radius − inset, never below 0), as a print offset does.
 * `ratio` is the template's width ÷ height.
 */
export function insetShape(a: CaseArea, ratio: number, inset: Insets = NO_INSETS): Shape {
  const ux = a.width; // one "area width" in template-width fractions
  const uy = a.width * ratio; // … and in template-height fractions
  const c = cornersOf(a);
  const corner = (r: number, ix: number, iy: number) => [Math.max(0, r - ix) * ux, Math.max(0, r - iy) * uy];
  const [tlx, tly] = corner(c.tl, inset.left, inset.top);
  const [trx, try_] = corner(c.tr, inset.right, inset.top);
  const [brx, bry] = corner(c.br, inset.right, inset.bottom);
  const [blx, bly] = corner(c.bl, inset.left, inset.bottom);
  return {
    x: a.x + inset.left * ux,
    y: a.y + inset.top * uy,
    w: Math.max(0, a.width - (inset.left + inset.right) * ux),
    h: Math.max(0, a.height - (inset.top + inset.bottom) * uy),
    rx: { tl: tlx, tr: trx, br: brx, bl: blx },
    ry: { tl: tly, tr: try_, br: bry, bl: bly },
  };
}

const even = (d: number): Insets => ({ top: d, right: d, bottom: d, left: d });

/** Where artwork is visible: the printable area with its corners. */
export const printableShape = (t: CaseTemplate, ratio: number) => insetShape(t.area, ratio);
/** How far artwork must reach so the print has no bare rim: the printable area grown by the bleed. */
export const bleedShape = (t: CaseTemplate, ratio: number) => insetShape(t.area, ratio, even(-t.bleed));
/** The guide for important content, or null when the template has no safe area. */
export const safeShape = (t: CaseTemplate, ratio: number) => (t.safe ? insetShape(t.area, ratio, t.safe) : null);
export const cameraShape = (t: CaseTemplate, ratio: number) => (t.camera ? insetShape(t.camera, ratio) : null);

/** Frames: the template as 0–width × 0–width/ratio units, the printable area as 0–1, or a canvas in pixels. */
export const templateFrame = (ratio: number, width = 100): Frame => ({ x0: 0, y0: 0, sx: width, sy: width / ratio });
export const areaFrame = (a: CaseArea): Frame => ({ x0: a.x, y0: a.y, sx: 1 / a.width, sy: 1 / a.height });
export const pixelFrame = (W: number, H: number): Frame => ({ x0: 0, y0: 0, sx: W, sy: H });

const num = (v: number) => String(Math.round(v * 1e5) / 1e5);

/** SVG / Path2D path of a shape in a frame; each radius is capped at half the side, so corners never overlap. */
export function shapePath(s: Shape, f: Frame): string {
  const x0 = (s.x - f.x0) * f.sx;
  const y0 = (s.y - f.y0) * f.sy;
  const x1 = x0 + s.w * f.sx;
  const y1 = y0 + s.h * f.sy;
  const r = (k: keyof Corners) => [Math.min(s.rx[k] * f.sx, (x1 - x0) / 2), Math.min(s.ry[k] * f.sy, (y1 - y0) / 2)];
  const [tlx, tly] = r("tl");
  const [trx, try_] = r("tr");
  const [brx, bry] = r("br");
  const [blx, bly] = r("bl");
  const n = num;
  return (
    `M${n(x0 + tlx)} ${n(y0)}H${n(x1 - trx)}A${n(trx)} ${n(try_)} 0 0 1 ${n(x1)} ${n(y0 + try_)}` +
    `V${n(y1 - bry)}A${n(brx)} ${n(bry)} 0 0 1 ${n(x1 - brx)} ${n(y1)}` +
    `H${n(x0 + blx)}A${n(blx)} ${n(bly)} 0 0 1 ${n(x0)} ${n(y1 - bly)}` +
    `V${n(y0 + tly)}A${n(tlx)} ${n(tly)} 0 0 1 ${n(x0 + tlx)} ${n(y0)}Z`
  );
}

/**
 * Everything except the camera, for an even-odd clip: a rectangle well beyond the template
 * with the camera as a hole. Clipped after the printable shape, so artwork never covers it,
 * even where the camera reaches past the printable edge. Empty without a camera.
 */
export function cameraCutPath(t: CaseTemplate, ratio: number, f: Frame): string {
  const camera = cameraShape(t, ratio);
  if (!camera) return "";
  const n = num;
  const [x0, y0, x1, y1] = [(-1 - f.x0) * f.sx, (-1 - f.y0) * f.sy, (2 - f.x0) * f.sx, (2 - f.y0) * f.sy];
  return `M${n(x0)} ${n(y0)}H${n(x1)}V${n(y1)}H${n(x0)}Z` + shapePath(camera, f);
}

/** Height ÷ width of the printable area on screen, given the template's width ÷ height. */
export const areaAspect = (a: CaseArea, ratio: number) => a.height / a.width / ratio;

/** The bleed box in the printable area's own fractions: artwork always covers it. */
export function bleedBox(t: CaseTemplate, ratio: number): Box {
  const bx = t.bleed;
  const by = t.bleed / areaAspect(t.area, ratio);
  return { x0: -bx, y0: -by, x1: 1 + bx, y1: 1 + by };
}

/**
 * Smallest width (fraction of the printable width) at which an unrotated, centred image of
 * height ÷ width `aspect` covers `box`. With no bleed this is the plain "cover" scale.
 */
export function coverScaleFor(aspect: number, box: Box, ofArea: number) {
  return Math.max(box.x1 - box.x0, ((box.y1 - box.y0) * ofArea) / aspect);
}
