import { BASE, GREY, INK, MH, MS, PAD, PAPER } from "./constants";
import { range } from "./range";
import type { Layout, RenderOptions } from "./types";

/** Draw a computed layout into any 2D context — shared by the on-screen canvas and PNG export. */
export function renderToContext(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  o: RenderOptions
): void {
  const { W, H, dpr, transparent, showArea, showGuides, fit } = o;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W * dpr, H * dpr);
  if (!transparent) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W * dpr, H * dpr);
  }

  const { totalW, inkTop, inkBottom, pad, cap } = L;
  const inkH = inkBottom - inkTop;
  const contW = totalW + pad * 2;
  const contH = inkH + pad * 2;
  const contCX = totalW / 2;
  const contCY = (inkTop + inkBottom) / 2;
  const scale = Math.min(W / contW, H / contH) * fit;
  const offX = W / 2 - scale * contCX;
  const offY = H / 2 - scale * contCY;
  const T = (mx: number, my: number): [number, number] => [
    (offX + mx * scale) * dpr,
    (offY + my * scale) * dpr,
  ];

  if (showGuides) {
    const [fx0, fy0] = T(-pad, inkTop - pad);
    const [fx1, fy1] = T(totalW + pad, inkBottom + pad);
    ctx.strokeStyle = GREY;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    ctx.setLineDash([]);
    const [bx0, by] = T(-pad, BASE);
    const [bx1] = T(totalW + pad, BASE);
    ctx.strokeStyle = "rgba(46,95,176,0.35)";
    ctx.beginPath();
    ctx.moveTo(bx0, by);
    ctx.lineTo(bx1, by);
    ctx.stroke();
  }

  if (showArea && L.mode === "optical") {
    const { laid } = L;
    ctx.fillStyle = "rgba(218,58,42,0.16)";
    range(laid.length - 1).forEach((i) => {
      const A = laid[i];
      const B = laid[i + 1];
      range(MH).forEach((y) => {
        if (A.g.has[y] !== 1 || B.g.has[y] !== 1) return;
        const aRight = A.inkLeftX + (A.g.width - A.g.Rr[y]);
        const bLeft = B.inkLeftX + B.g.Lp[y];
        const right = Math.min(bLeft, aRight + cap);
        if (right <= aRight) return;
        const [x0, yy0] = T(aRight, y);
        const [x1] = T(right, y);
        ctx.fillRect(x0, yy0, x1 - x0, Math.ceil(scale * dpr) + 1);
      });
    });
  }

  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.font = `${L.weight} ${MS}px "${L.family}"`;

  if (L.mode === "optical") {
    L.laid.forEach((l) => {
      const penMx = l.inkLeftX - (l.g.inkLeft - PAD);
      const [px, py] = T(penMx, BASE);
      ctx.save();
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, px, py);
      ctx.fillText(l.g.ch, 0, 0);
      ctx.restore();
    });
    if (showGuides) {
      ctx.strokeStyle = "rgba(46,95,176,0.5)";
      ctx.lineWidth = 1;
      L.laid.forEach((l) => {
        [l.inkLeftX, l.inkLeftX + l.g.width].forEach((ex) => {
          const [gx, gy0] = T(ex, inkTop - pad * 0.5);
          const [, gy1] = T(ex, inkBottom + pad * 0.5);
          ctx.beginPath();
          ctx.moveTo(gx, gy0);
          ctx.lineTo(gx, gy1);
          ctx.stroke();
        });
      });
    }
    return;
  }

  const penMx = PAD - L.native.iL;
  const [px, py] = T(penMx, BASE);
  ctx.save();
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, px, py);
  ctx.fillText(L.text, 0, 0);
  ctx.restore();
}
