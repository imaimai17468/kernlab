import { FONTS } from "./constants";
import type { Font } from "./types";

/** Google Fonts `family=` param for one family (with weights when non-default). */
export function famCssParam(f: Font): string {
  const fam = f.name.replace(/ /g, "+");
  if (f.weights.length === 1 && f.weights[0] === 400) return `family=${fam}`;
  return `family=${fam}:wght@${f.weights.join(";")}`;
}

/**
 * Stylesheet href for one family (all of its tool weights). Families are
 * fetched one stylesheet each, on demand: a combined all-family stylesheet
 * measures ~458 KB gzipped (the Japanese families ship hundreds of
 * unicode-range subset rules each), which is far too heavy to pay on every
 * page load for fonts the user may never select.
 */
export function fontHref(f: Font): string {
  return `https://fonts.googleapis.com/css2?${famCssParam(f)}&display=swap`;
}

/** UI monospace for DOM text (readouts, captions) — not a tool font. */
export const UI_FONT: Font = {
  name: "Space Mono",
  weights: [400, 700],
  note: "UIモノスペース",
};

/** Tool font entry for a family name (undefined for unknown names). */
export function fontByName(name: string): Font | undefined {
  return FONTS.find((f) => f.name === name);
}

/** Stylesheet href for a single family+weight (embedded in exported SVG). */
export function singleFontCss(family: string, weight: number): string {
  const fam = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${weight}&display=swap`;
}
