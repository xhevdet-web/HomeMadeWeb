import { expect, test } from "@playwright/test";
import {
  areaFrame,
  bleedBox,
  bleedShape,
  cameraCutPath,
  cameraShape,
  coverScaleFor,
  parseCaseTemplate,
  printableShape,
  safeShape,
  shapePath,
  templateFrame,
} from "../src/studios/cases/geometry";

/*
 * Case template geometry, without a browser. The expected paths are shared with the admin's
 * copy (initial-project-front/tests/case-geometry.spec.mjs): if either side changes its
 * formula, its test fails, so the admin editor and the customer studio never drift apart.
 */

const LEGACY = {
  front: { x: 0.04, y: 0.02, width: 0.92, height: 0.96, radius: 0.14 },
  camera: { x: 0.1, y: 0.03, width: 0.4, height: 0.15, radius: 0.2 },
};
const ADVANCED = {
  front: {
    x: 0.03,
    y: 0.015,
    width: 0.94,
    height: 0.97,
    radius: 0.18,
    radii: { tl: 0.18, tr: 0.18, br: 0.12, bl: 0.12 },
    bleed: 0.03,
    safe: { top: 0.3, right: 0.06, bottom: 0.06, left: 0.06 },
  },
  camera: { x: 0.07, y: 0.025, width: 0.4, height: 0.19, radius: 0.22, radii: { tl: 0.3, tr: 0.22, br: 0.22, bl: 0.22 } },
};
const FALLBACK = { x: 0, y: 0, width: 1, height: 1 };
const RATIO = 0.5; // template width ÷ height
const view = templateFrame(RATIO);

const EXPECTED = {
  legacyPrintable: "M16.88 4H83.12A12.88 12.88 0 0 1 96 16.88V183.12A12.88 12.88 0 0 1 83.12 196H16.88A12.88 12.88 0 0 1 4 183.12V16.88A12.88 12.88 0 0 1 16.88 4Z",
  legacyCamera: "M18 6H42A8 8 0 0 1 50 14V28A8 8 0 0 1 42 36H18A8 8 0 0 1 10 28V14A8 8 0 0 1 18 6Z",
  advPrintable: "M19.92 3H80.08A16.92 16.92 0 0 1 97 19.92V185.72A11.28 11.28 0 0 1 85.72 197H14.28A11.28 11.28 0 0 1 3 185.72V19.92A16.92 16.92 0 0 1 19.92 3Z",
  advBleed: "M19.92 0.18H80.08A19.74 19.74 0 0 1 99.82 19.92V185.72A14.1 14.1 0 0 1 85.72 199.82H14.28A14.1 14.1 0 0 1 0.18 185.72V19.92A19.74 19.74 0 0 1 19.92 0.18Z",
  advSafe: "M19.92 31.2H80.08A11.28 0 0 0 1 91.36 31.2V185.72A5.64 5.64 0 0 1 85.72 191.36H14.28A5.64 5.64 0 0 1 8.64 185.72V31.2A11.28 0 0 0 1 19.92 31.2Z",
  advCamera: "M19 5H38.2A8.8 8.8 0 0 1 47 13.8V34.2A8.8 8.8 0 0 1 38.2 43H15.8A8.8 8.8 0 0 1 7 34.2V17A12 12 0 0 1 19 5Z",
};

/** The studio's formula before per-corner radii, kept here as the reference for old templates. */
function legacyAreaPath(a: { x: number; y: number; width: number; height: number; radius: number }, ratio: number) {
  const [x, y, w, h] = [a.x * 100, (a.y * 100) / ratio, a.width * 100, (a.height * 100) / ratio];
  const r = a.radius * a.width * 100;
  const rx = Math.min(r, w / 2);
  const ry = Math.min(r, h / 2);
  return [x + rx, y, x + w - rx, rx, ry, x + w, y + ry, y + h - ry, x + w - rx, y + h, x + rx, x, y + h - ry, y + ry];
}
const numbers = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

test.describe("case template geometry", () => {
  test("an existing single-radius template draws exactly as before", () => {
    const t = parseCaseTemplate(LEGACY, FALLBACK);
    expect(t.bleed).toBe(0);
    expect(t.safe).toBeNull();
    expect(shapePath(printableShape(t, RATIO), view)).toBe(EXPECTED.legacyPrintable);
    expect(shapePath(cameraShape(t, RATIO)!, view)).toBe(EXPECTED.legacyCamera);
    // Same points as the old studio formula (M, H, A radii, A end, V, …).
    const [mx, my, hx, rx, ry, ax, ay, vy] = legacyAreaPath(LEGACY.front, RATIO);
    // Path numbers: M x y, H x, A rx ry 0 0 1 x y, V y (the arc flags sit at 5–7).
    const got = numbers(EXPECTED.legacyPrintable);
    for (const [i, want] of [[0, mx], [1, my], [2, hx], [3, rx], [4, ry], [8, ax], [9, ay], [10, vy]]) expect(got[i]).toBeCloseTo(want, 4);
  });

  test("four independent corner radii, bleed, safe area and camera corners", () => {
    const t = parseCaseTemplate(ADVANCED, FALLBACK);
    expect(shapePath(printableShape(t, RATIO), view)).toBe(EXPECTED.advPrintable);
    expect(shapePath(bleedShape(t, RATIO), view)).toBe(EXPECTED.advBleed);
    expect(shapePath(safeShape(t, RATIO)!, view)).toBe(EXPECTED.advSafe);
    expect(shapePath(cameraShape(t, RATIO)!, view)).toBe(EXPECTED.advCamera);
  });

  test("safe area and bleed scale with the preview, keeping their share of the case", () => {
    const t = parseCaseTemplate(ADVANCED, FALLBACK);
    for (const width of [320, 375, 430, 1024]) {
      const frame = templateFrame(RATIO, width);
      const safe = numbers(shapePath(safeShape(t, RATIO)!, frame));
      const bleed = numbers(shapePath(bleedShape(t, RATIO)!, frame));
      // Start point of each outline, as a share of the preview width: independent of its size.
      expect(safe[1] / width).toBeCloseTo(numbers(EXPECTED.advSafe)[1] / 100, 6);
      expect(bleed[0] / width).toBeCloseTo(numbers(EXPECTED.advBleed)[0] / 100, 6);
    }
    // The same physical bleed on every side: 3% of the printable width.
    const box = bleedBox(t, RATIO);
    const ofArea = t.area.height / t.area.width / RATIO;
    expect(-box.x0).toBeCloseTo(0.03, 10);
    expect(-box.y0 * ofArea).toBeCloseTo(0.03, 10);
  });

  test("broken or missing values fall back safely", () => {
    const t = parseCaseTemplate({ front: { ...LEGACY.front, radii: { tl: 0.1 }, bleed: "x", safe: { top: -1 } }, camera: { x: 0.1 } }, FALLBACK);
    expect(t.area.radii).toBeUndefined();
    expect(t.bleed).toBe(0);
    expect(t.safe).toBeNull();
    expect(t.camera).toBeNull();
    expect(parseCaseTemplate(null, FALLBACK).area).toEqual(FALLBACK);
  });

  test("cover scale fills the bleed box, and is the plain cover without bleed", () => {
    const ofArea = 2;
    expect(coverScaleFor(1, { x0: 0, y0: 0, x1: 1, y1: 1 }, ofArea)).toBe(2);
    expect(coverScaleFor(4, { x0: 0, y0: 0, x1: 1, y1: 1 }, ofArea)).toBe(1);
    expect(coverScaleFor(4, { x0: -0.05, y0: -0.025, x1: 1.05, y1: 1.025 }, ofArea)).toBeCloseTo(1.1, 10);
  });

  test("the camera cut covers the whole template, with the camera as a hole", () => {
    const t = parseCaseTemplate(ADVANCED, FALLBACK);
    const cut = cameraCutPath(t, RATIO, areaFrame(t.area));
    const [x0, y0, x1, y1] = numbers(cut); // M x0 y0 H x1 V y1 …
    // Template edges in the printable area's fractions lie inside the outer rectangle.
    expect(x0).toBeLessThan(-t.area.x / t.area.width);
    expect(y0).toBeLessThan(-t.area.y / t.area.height);
    expect(x1).toBeGreaterThan((1 - t.area.x) / t.area.width);
    expect(y1).toBeGreaterThan((1 - t.area.y) / t.area.height);
    expect(cameraCutPath(parseCaseTemplate({ front: LEGACY.front }, FALLBACK), RATIO, areaFrame(t.area))).toBe("");
  });
});
