import type { Font as OtFont } from "opentype.js";
import { BASE, INK, MS, PAD } from "./constants";
import { getCustomFontForExport } from "./customFonts";
import { singleFontCss } from "./fonts";
import { renderToContext } from "./render";
import type { Layout } from "./types";

/** Trigger a browser download for a generated blob. */
function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Filename stem derived from the logo text + family (keeps kana/kanji, collapses the rest). */
export function baseName(text: string, family: string): string {
  const stem = (text.trim() || "logo").replace(/[^\w一-龠ぁ-んァ-ヶ]+/g, "_");
  return `${stem}_${family.replace(/ /g, "")}`;
}

/** High-resolution raster export sized from the ink box (~2400px wide). */
export function exportPNG(
  L: Layout,
  text: string,
  family: string,
  transparent: boolean
): void {
  const inkH = L.inkBottom - L.inkTop;
  const contW = L.totalW + L.pad * 2;
  const contH = inkH + L.pad * 2;
  const exportScale = Math.min(6, Math.max(1.5, 2400 / contW));
  const cv = document.createElement("canvas");
  cv.width = Math.round(contW * exportScale);
  cv.height = Math.round(contH * exportScale);
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  renderToContext(ctx, L, {
    W: contW,
    H: contH,
    dpr: exportScale,
    transparent,
    showArea: false,
    showGuides: false,
    fit: 1,
  });
  cv.toBlob((blob) => {
    if (blob) download(blob, `${baseName(text, family)}.png`);
  }, "image/png");
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svgDocument = (L: Layout, body: string): string => {
  const inkH = L.inkBottom - L.inkTop;
  const minX = -L.pad;
  const minY = L.inkTop - L.pad;
  const w = L.totalW + L.pad * 2;
  const h = inkH + L.pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}">
${body}</svg>
`;
};

/** SVG body referencing the Google web font via @import (built-in families). */
function webFontSvgBody(L: Layout): string {
  const glyphs =
    L.mode === "optical"
      ? L.laid
          .map((l) => {
            const penX = l.inkLeftX - (l.g.inkLeft - PAD);
            return `    <text x="${penX.toFixed(2)}" y="${BASE}">${esc(l.g.ch)}</text>\n`;
          })
          .join("")
      : `    <text x="${(PAD - L.native.iL).toFixed(2)}" y="${BASE}">${esc(L.text)}</text>\n`;
  const css = singleFontCss(L.family, L.weight);
  return `  <defs><style>@import url('${css}');</style></defs>
  <g fill="${INK}" font-family="'${L.family}', sans-serif" font-size="${MS}" font-weight="${L.weight}">
${glyphs}  </g>
`;
}

/**
 * SVG body with the glyphs embedded as outlines (custom fonts, spec R5): the
 * artwork renders identically everywhere with no font reference and no font
 * redistribution. Optical mode places each glyph at the engine-computed pen
 * position; native mode lays the whole string out from the font's own
 * advances and kerning (the same metrics the browser draws from).
 */
function outlineSvgBody(L: Layout, font: OtFont): string {
  const paths =
    L.mode === "optical"
      ? L.laid
          .map((l) => {
            const penX = l.inkLeftX - (l.g.inkLeft - PAD);
            return `    <path d="${font.getPath(l.g.ch, penX, BASE, MS).toPathData(2)}"/>\n`;
          })
          .join("")
      : `    <path d="${font
          .getPath(L.text, PAD - L.native.iL, BASE, MS, { kerning: true })
          .toPathData(2)}"/>\n`;
  return `  <g fill="${INK}">
${paths}  </g>
`;
}

/**
 * Vector export. Built-in families reference the web font via @import
 * (outline it in an editor for a self-contained logo); custom families embed
 * glyph outlines directly. Variable custom fonts are not exportable (opentype
 * outlines only the default master) — the UI disables the button, and this
 * guard keeps a stale call from producing wrong-weight artwork.
 */
export function exportSVG(L: Layout, text: string, family: string): void {
  const custom = getCustomFontForExport(L.family);
  if (custom?.variable) return;
  const body = custom ? outlineSvgBody(L, custom.font) : webFontSvgBody(L);
  download(
    new Blob([svgDocument(L, body)], { type: "image/svg+xml" }),
    `${baseName(text, family)}.svg`
  );
}
