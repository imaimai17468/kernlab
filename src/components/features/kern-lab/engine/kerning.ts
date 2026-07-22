import { ALPHA, BASE, MH, MS, MW, PAD } from "./constants";
import { range } from "./range";
import type { Glyph, Layout, Mode, PairInfo, PlacedGlyph } from "./types";

// Module-level memoization of glyph measurements. Keys include family+weight,
// and glyphs are only measured after the font spec has settled (see
// fontLoader.ts), so entries never mix fallback and real metrics. Capped so a
// long session cycling many fonts cannot grow it unboundedly.
const glyphCache = new Map<string, Glyph>();
const GLYPH_CACHE_MAX = 512;

/**
 * Drop every memoized measurement. The custom-font registry calls this on
 * every mutation: a same-name replacement re-binds the family string to a
 * different face, so entries keyed `${ch}|${family}|${weight}` would otherwise
 * keep serving the OLD font's ink geometry after the swap.
 */
export function clearGlyphCache(): void {
  glyphCache.clear();
}

/** Measure one glyph on an offscreen raster: ink bounding box + per-row edge profiles. */
function measureGlyph(ch: string, family: string, weight: number): Glyph {
  const key = `${ch}|${family}|${weight}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;

  const cv = document.createElement("canvas");
  cv.width = MW;
  cv.height = MH;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("KernLab: 2D canvas context unavailable");
  ctx.clearRect(0, 0, MW, MH);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${weight} ${MS}px "${family}"`;
  const advance = ctx.measureText(ch).width;
  ctx.fillText(ch, PAD, BASE);

  const img = ctx.getImageData(0, 0, MW, MH).data;
  const firstX = new Int16Array(MH).fill(-1);
  const lastX = new Int16Array(MH).fill(-1);
  const has = new Uint8Array(MH);
  let inkLeft = 1e9;
  let inkRight = -1e9;
  let inkTop = -1;
  let inkBottom = -1;

  range(MH).forEach((y) => {
    let fx = -1;
    let lx = -1;
    const row = y * MW * 4;
    range(MW).forEach((x) => {
      if (img[row + x * 4 + 3] > ALPHA) {
        if (fx === -1) fx = x;
        lx = x;
      }
    });
    if (fx !== -1) {
      firstX[y] = fx;
      lastX[y] = lx;
      has[y] = 1;
      if (fx < inkLeft) inkLeft = fx;
      if (lx > inkRight) inkRight = lx;
      if (inkTop === -1) inkTop = y;
      inkBottom = y;
    }
  });

  const hasInk = inkRight >= inkLeft;
  const width = hasInk ? inkRight - inkLeft : advance * 0.5;
  const Lp = new Float32Array(MH);
  const Rr = new Float32Array(MH);
  range(MH).forEach((y) => {
    if (has[y] === 1) {
      Lp[y] = firstX[y] - inkLeft;
      Rr[y] = inkRight - lastX[y];
    }
  });

  const g: Glyph = {
    ch,
    advance,
    hasInk,
    width,
    inkLeft,
    inkRight,
    inkTop,
    inkBottom,
    has,
    firstX,
    lastX,
    Lp,
    Rr,
  };
  if (glyphCache.size >= GLYPH_CACHE_MAX) glyphCache.clear();
  glyphCache.set(key, g);
  return g;
}

/**
 * Solve the spacing `s` between two glyphs so the capped negative-space area
 * averages to `target`, then nudge so the tightest row stays above `floor`.
 */
export function solveS(
  A: Glyph,
  B: Glyph,
  target: number,
  cap: number,
  floor: number
): number {
  const rows = range(MH).filter((y) => A.has[y] === 1 && B.has[y] === 1);
  if (rows.length === 0) return target;

  const metric = (s: number): number =>
    rows.reduce((sum, y) => sum + Math.min(s + A.Rr[y] + B.Lp[y], cap), 0) /
    rows.length;

  let lo = -MS * 1.5;
  let hi = MS * 2;
  range(46).forEach(() => {
    const mid = (lo + hi) / 2;
    if (metric(mid) < target) lo = mid;
    else hi = mid;
  });
  let s = (lo + hi) / 2;

  const minGap = rows.reduce(
    (m, y) => Math.min(m, s + A.Rr[y] + B.Lp[y]),
    Infinity
  );
  if (minGap < floor) s += floor - minGap;
  return s;
}

type ComputeLayoutParams = {
  readonly text: string;
  readonly family: string;
  readonly weight: number;
  readonly tightness: number;
  readonly frame: number;
  readonly mode: Mode;
};

/** Build the shared layout consumed by the on-screen canvas, PNG and SVG exporters. */
export function computeLayout(p: ComputeLayoutParams): Layout | null {
  const { text, family, weight, tightness, frame, mode } = p;
  const chars = Array.from(text);
  const drawable = chars.filter((c) => c !== " ");
  if (drawable.length === 0) return null;

  // Single pass: measure each drawable glyph and collect ink heights.
  const inkHeights: number[] = [];
  drawable.forEach((c) => {
    const g = measureGlyph(c, family, weight);
    if (g.hasInk) inkHeights.push(g.inkBottom - g.inkTop);
  });
  const heights = inkHeights.toSorted((a, b) => a - b);
  const refH = heights.length ? heights[Math.floor(heights.length / 2)] : MS;

  const target = (0.03 + 0.2 * tightness) * refH;
  const cap = target * 2.6 + 6;
  const floor = Math.max(2, target * 0.18);
  const spaceGap = target * 3.2;
  const pairInfo: PairInfo[] = [];

  if (mode === "optical") {
    const raw: PlacedGlyph[] = [];
    let prev: PlacedGlyph | null = null;
    let pendingSpace = false;
    chars.forEach((c) => {
      if (c === " ") {
        pendingSpace = true;
        return;
      }
      const g = measureGlyph(c, family, weight);
      if (!g.hasInk) {
        pendingSpace = false;
        prev = null;
        return;
      }
      let x: number;
      if (prev === null) {
        x = 0;
      } else {
        let s = solveS(prev.g, g, target, cap, floor);
        if (pendingSpace) s += spaceGap;
        x = prev.inkLeftX + prev.g.width + s;
        pairInfo.push({ a: prev.g.ch, b: c, s, index: pairInfo.length });
      }
      const placed: PlacedGlyph = { g, inkLeftX: x };
      raw.push(placed);
      prev = placed;
      pendingSpace = false;
    });
    if (raw.length === 0) return null;

    const shift = raw[0].inkLeftX;
    const laid = raw.map((l) => ({ g: l.g, inkLeftX: l.inkLeftX - shift }));
    const last = laid[laid.length - 1];
    const totalW = last.inkLeftX + last.g.width;
    const inkTop = laid.reduce((m, l) => Math.min(m, l.g.inkTop), 1e9);
    const inkBottom = laid.reduce((m, l) => Math.max(m, l.g.inkBottom), -1e9);
    const pad = (0.08 + 0.55 * frame) * (inkBottom - inkTop);
    return {
      mode: "optical",
      family,
      weight,
      text,
      laid,
      totalW,
      inkTop,
      inkBottom,
      pad,
      cap,
      pairInfo,
    };
  }

  const cv = document.createElement("canvas");
  const c2 = cv.getContext("2d", { willReadFrequently: true });
  if (!c2) throw new Error("KernLab: 2D canvas context unavailable");
  c2.font = `${weight} ${MS}px "${family}"`;
  // Size the raster from the actual text width (+ one em of padding each side) so
  // ordinary strings are never clipped, capped at a safe canvas dimension so
  // pathologically long input clips (bounded) instead of exceeding the browser's
  // max canvas size and throwing in getImageData. Setting cv.width resets the
  // context state, so re-apply font/baseline/fill afterwards.
  cv.width = Math.min(4096, Math.ceil(PAD * 2 + c2.measureText(text).width));
  cv.height = MH;
  c2.font = `${weight} ${MS}px "${family}"`;
  c2.textBaseline = "alphabetic";
  c2.fillStyle = "#000";
  c2.fillText(text, PAD, BASE);
  const width = cv.width;
  const img = c2.getImageData(0, 0, width, MH).data;
  let iL = 1e9;
  let iR = -1e9;
  let iT = -1;
  let iB = -1;
  range(MH).forEach((y) => {
    const row = y * width * 4;
    range(width).forEach((x) => {
      if (img[row + x * 4 + 3] > ALPHA) {
        if (x < iL) iL = x;
        if (x > iR) iR = x;
        if (iT === -1) iT = y;
        iB = y;
      }
    });
  });
  const pad = (0.08 + 0.55 * frame) * (iB - iT);
  return {
    mode: "native",
    family,
    weight,
    text,
    native: { iL },
    totalW: iR - iL,
    inkTop: iT,
    inkBottom: iB,
    pad,
    cap,
    pairInfo,
  };
}
