import { FONTS } from "./constants";
import type { Font } from "./types";

/** Google Fonts `family=` param for one family (with weights when non-default). */
export function famCssParam(f: Font): string {
  const fam = f.name.replace(/ /g, "+");
  if (f.weights.length === 1 && f.weights[0] === 400) return `family=${fam}`;
  return `family=${fam}:wght@${f.weights.join(";")}`;
}

/** Stylesheet href for every tool font plus Space Mono (UI monospace). */
export function buildFontsHref(): string {
  const parts = FONTS.map(famCssParam);
  parts.push("family=Space+Mono:wght@400;700");
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

/** Stylesheet href for a single family+weight (embedded in exported SVG). */
export function singleFontCss(family: string, weight: number): string {
  const fam = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${weight}&display=swap`;
}
