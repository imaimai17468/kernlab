import type { Font } from "./types";

// Canvas-render colors. The DOM uses the kl-* Tailwind theme tokens (registered
// in src/styles.css); the canvas needs these as JS strings for ctx fillStyle /
// strokeStyle, so only the colors the canvas actually draws with live here —
// keep them in step with the matching --color-kl-* theme tokens.
export const INK = "#17181A";
export const PAPER = "#E9EBE6";
export const GREY = "#9A9C97";

// Menu order: Latin display faces first, then Japanese families. Every
// family/weight combination is validated against the live Google Fonts css2
// endpoint (an unknown weight turns the whole stylesheet request into a 400).
export const FONTS: readonly Font[] = [
  { name: "Anton", weights: [400], note: "極太コンデンス" },
  { name: "Bebas Neue", weights: [400], note: "コンデンス" },
  { name: "Archivo Black", weights: [400], note: "極太サンス" },
  { name: "Oswald", weights: [400, 600, 700], note: "コンデンス" },
  { name: "Inter", weights: [400, 700, 900], note: "UIサンス" },
  { name: "Roboto", weights: [400, 700, 900], note: "ニュートラルサンス" },
  { name: "Lato", weights: [400, 700, 900], note: "ヒューマニストサンス" },
  { name: "Poppins", weights: [400, 600, 700], note: "ジオメトリック" },
  { name: "Montserrat", weights: [500, 700, 900], note: "ジオメトリック" },
  { name: "Space Grotesk", weights: [500, 700], note: "グロテスク" },
  { name: "Playfair Display", weights: [400, 700, 900], note: "セリフ" },
  { name: "Abril Fatface", weights: [400], note: "ディスプレイセリフ" },
  { name: "Cormorant Garamond", weights: [500, 700], note: "エレガントセリフ" },
  { name: "Noto Sans JP", weights: [400, 700, 900], note: "和文ゴシック" },
  {
    name: "Zen Kaku Gothic New",
    weights: [400, 700, 900],
    note: "和文モダンゴシック",
  },
  {
    name: "M PLUS Rounded 1c",
    weights: [400, 700, 800],
    note: "和文丸ゴシック",
  },
  { name: "Noto Serif JP", weights: [400, 700, 900], note: "和文明朝" },
  {
    name: "Shippori Mincho",
    weights: [400, 600, 800],
    note: "和文オールド明朝",
  },
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
