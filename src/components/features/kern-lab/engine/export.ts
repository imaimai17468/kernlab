import { BASE, INK, MS, PAD } from "./constants";
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

/** Vector export referencing the web font (outline it in an editor for a self-contained logo). */
export function exportSVG(L: Layout, text: string, family: string): void {
  const inkH = L.inkBottom - L.inkTop;
  const minX = -L.pad;
  const minY = L.inkTop - L.pad;
  const w = L.totalW + L.pad * 2;
  const h = inkH + L.pad * 2;

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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}">
  <defs><style>@import url('${css}');</style></defs>
  <g fill="${INK}" font-family="'${L.family}', sans-serif" font-size="${MS}" font-weight="${L.weight}">
${glyphs}  </g>
</svg>
`;
  download(
    new Blob([svg], { type: "image/svg+xml" }),
    `${baseName(text, family)}.svg`
  );
}
