import type { Font } from "./types";

// Canvas-render colors. The DOM uses the kl-* Tailwind theme tokens (registered
// in src/styles.css); the canvas needs these as JS strings for ctx fillStyle /
// strokeStyle, so only the colors the canvas actually draws with live here —
// keep them in step with the matching --color-kl-* theme tokens.
export const INK = "#17181A";
export const PAPER = "#E9EBE6";
export const GREY = "#9A9C97";

/** Source repository (footer link + how-it-works source references). */
export const GITHUB_URL = "https://github.com/imaimai17468/kernlab";

/** The one accent-link treatment, shared by every text link in the tool.
 * kl-hit-area (styles.css) grows the touch target to 44px on coarse pointers
 * via a pseudo-element, without inflating the visible line box. */
export const ACCENT_LINK_CLASS =
  "kl-hit-area inline-flex items-center text-kl-blue underline decoration-from-font underline-offset-4 transition-colors duration-150 ease-out hover:text-kl-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none";

export const FONTS: readonly Font[] = [
  { name: "Anton", weights: [400], note: "極太コンデンス" },
  { name: "Bebas Neue", weights: [400], note: "コンデンス" },
  { name: "Archivo Black", weights: [400], note: "極太サンス" },
  { name: "Oswald", weights: [400, 600, 700], note: "コンデンス" },
  { name: "Poppins", weights: [400, 600, 700], note: "ジオメトリック" },
  { name: "Montserrat", weights: [500, 700, 900], note: "ジオメトリック" },
  { name: "Space Grotesk", weights: [500, 700], note: "グロテスク" },
  { name: "Playfair Display", weights: [400, 700, 900], note: "セリフ" },
  { name: "Abril Fatface", weights: [400], note: "ディスプレイセリフ" },
  { name: "Cormorant Garamond", weights: [500, 700], note: "エレガントセリフ" },
];

// Measurement-space geometry (a high-res offscreen raster per glyph).
/** Glyph render size (also the reference em). */
export const MS = 240;
/** Left pen origin / raster padding — one em wide, kept in step with MS. */
export const PAD = 240;
export const MW = Math.round(PAD + MS * 2.2);
export const MH = Math.round(MS * 2);
export const BASE = Math.round(MH * 0.72);
/** Alpha threshold (0-255) above which a pixel counts as ink. */
export const ALPHA = 40;
