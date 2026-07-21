"use client";

import { useEffect, useRef, useState } from "react";
import { FONTS, MS, PAPER } from "./constants";
import { Corner } from "./Corner";
import { exportPNG, exportSVG } from "./export";
import { Field } from "./Field";
import { buildFontsHref } from "./fonts";
import { computeLayout } from "./kerning";
import { renderToContext } from "./render";
import { Slider } from "./Slider";
import "./styles.css";
import { Toggle } from "./Toggle";
import type { GlyphCache, Layout, Mode, Pair, Size } from "./types";

const inputClass =
  "w-full appearance-none border border-kl-ink bg-kl-panel px-3 py-2.5 text-sm text-kl-ink hover:bg-kl-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue max-sm:min-h-11";

const exportBtnClass =
  "cursor-pointer appearance-none border border-kl-ink bg-kl-panel px-3.5 py-2 font-kl-mono text-xs font-bold transition duration-150 ease-out hover:bg-kl-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-kl-panel motion-reduce:transition-none max-sm:flex-1 max-sm:text-center";

const captionClass = "text-xs font-medium tracking-wide text-kl-muted";

export function KernLab() {
  const [text, setText] = useState("WAVE");
  const [family, setFamily] = useState("Anton");
  const [weight, setWeight] = useState(400);
  const [tightness, setTightness] = useState(0.4);
  const [frame, setFrame] = useState(0.5);
  const [showArea, setShowArea] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [mode, setMode] = useState<Mode>("optical");
  const [fontReady, setFontReady] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [size, setSize] = useState<Size>({ w: 800, h: 440 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const glyphCache = useRef<GlyphCache>(new Map());
  const layoutRef = useRef<Layout | null>(null);

  // The selected weight, clamped to the current family's supported weights.
  // Derived (not synced via effect) so a family switch corrects it during render.
  const currentFont = FONTS.find((f) => f.name === family);
  const weights = currentFont?.weights ?? [400];
  const effWeight = weights.includes(weight) ? weight : weights[0];

  // Inject the Google Fonts stylesheet once.
  useEffect(() => {
    const id = "kernlab-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = buildFontsHref();
    document.head.appendChild(link);
  }, []);

  // Wait for the active family/weight to be ready, then invalidate the glyph cache.
  useEffect(() => {
    let alive = true;
    setFontReady(false);
    void (async () => {
      try {
        await document.fonts.load(`${effWeight} ${MS}px "${family}"`);
        await document.fonts.ready;
      } catch {
        /* fonts may be unavailable; fall back to whatever metrics exist */
      }
      if (alive) {
        glyphCache.current.clear();
        setFontReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [family, effWeight]);

  // Track the canvas box size for a crisp device-pixel-ratio render.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(320, r.width), h: Math.max(280, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw to the on-screen canvas whenever inputs change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w: cw, h: ch } = size;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const layout = fontReady
      ? computeLayout({
          text,
          family,
          weight: effWeight,
          tightness,
          frame,
          mode,
          cache: glyphCache.current,
        })
      : null;
    layoutRef.current = layout;

    if (!layout) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setPairs([]);
      return;
    }

    setPairs(layout.pairInfo.map((p) => ({ ...p, em: p.s / MS })));
    renderToContext(ctx, layout, {
      W: cw,
      H: ch,
      dpr,
      transparent: false,
      showArea,
      showGuides,
      fit: 0.92,
    });
  }, [
    text,
    family,
    effWeight,
    tightness,
    frame,
    mode,
    fontReady,
    size,
    showArea,
    showGuides,
  ]);

  const handleExportPng = (transparent: boolean) => {
    const layout = layoutRef.current;
    if (layout) exportPNG(layout, text, family, transparent);
  };
  const handleExportSvg = () => {
    const layout = layoutRef.current;
    if (layout) exportSVG(layout, text, family);
  };

  const canExport = fontReady && Array.from(text).some((c) => c !== " ");

  return (
    <div className="min-h-dvh bg-kl-paper font-kl-sans text-kl-ink">
      <div className="mx-auto max-w-6xl px-5 pt-5 pb-10 max-sm:px-3.5 max-sm:pt-4 max-sm:pb-8">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-kl-ink pb-2.5">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-extrabold tracking-tight">
              KERN LAB
            </span>
            <span className="text-xs text-kl-muted">
              光学カーニング自動調整
            </span>
          </div>
          <span className="text-xs text-kl-muted max-sm:hidden">
            字面の面積からスペーシングを算出
          </span>
        </header>

        <div
          ref={wrapRef}
          className="kl-canvas-box relative overflow-hidden border border-kl-ink bg-kl-paper"
        >
          {!fontReady && (
            <div className="absolute inset-0 grid place-items-center text-xs text-kl-muted">
              フォント読み込み中…
            </div>
          )}
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="カーニング調整済みロゴのプレビュー"
            className="block"
          />
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-kl-top items-end gap-3 max-sm:grid-cols-2">
            <Field label="ロゴ文字" className="max-sm:col-span-2">
              <input
                className={inputClass}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="文字を入力"
              />
            </Field>
            <Field label="フォント">
              <select
                className={inputClass}
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                {FONTS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} — {f.note}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ウェイト">
              <select
                className={`${inputClass} min-w-24`}
                value={effWeight}
                onChange={(e) => setWeight(Number(e.target.value))}
              >
                {weights.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-kl-ctrl items-center gap-5 max-sm:grid-cols-1 max-sm:gap-4">
            <Slider
              label="字間（つめ / あき）"
              value={tightness}
              onChange={setTightness}
              left="つめ"
              right="あき"
            />
            <Slider
              label="額縁の余白（上下左右）"
              value={frame}
              onChange={setFrame}
              left="狭"
              right="広"
            />
            <div className="flex flex-wrap gap-2 max-sm:*:flex-1">
              <Toggle on={showArea} onToggle={() => setShowArea((v) => !v)}>
                余白の面積
              </Toggle>
              <Toggle on={showGuides} onToggle={() => setShowGuides((v) => !v)}>
                ガイド
              </Toggle>
              <Toggle
                on={mode === "native"}
                onToggle={() =>
                  setMode((m) => (m === "optical" ? "native" : "optical"))
                }
                accent="blue"
              >
                標準と比較
              </Toggle>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-kl-ink pt-3.5">
            <span className={captionClass}>書き出し</span>
            <button
              type="button"
              className={exportBtnClass}
              disabled={!canExport}
              onClick={() => handleExportPng(true)}
            >
              PNG（透過）
            </button>
            <button
              type="button"
              className={exportBtnClass}
              disabled={!canExport}
              onClick={() => handleExportPng(false)}
            >
              PNG（用紙）
            </button>
            <button
              type="button"
              className={`${exportBtnClass} text-kl-blue`}
              disabled={!canExport}
              onClick={handleExportSvg}
            >
              SVG（ベクター）
            </button>
            <span className="text-xs text-kl-muted max-sm:hidden">
              PNGは字面から最適サイズ・約2400px幅で出力／SVGはフォント埋め込み
            </span>
          </div>

          <div>
            <div className={`mb-2 ${captionClass}`}>
              {mode === "native"
                ? "標準メトリクス表示中 — トグルを戻すと自動調整結果に戻ります"
                : "ペアごとの自動調整量（em ／ 負値＝字面をつめている）"}
            </div>
            <div className="flex flex-wrap gap-2">
              {mode === "optical" && pairs.length === 0 && (
                <span className="text-xs text-kl-muted">
                  2文字以上でペアが表示されます
                </span>
              )}
              {mode === "optical" &&
                pairs.map((p, i) => (
                  <div
                    key={`${p.a}-${p.b}-${i}`}
                    className="flex items-center gap-2 border border-kl-ink bg-kl-panel px-2.5 py-1.5 font-kl-mono text-xs"
                  >
                    <span className="font-bold">
                      {p.a}
                      <span className="mx-0.5 text-kl-grey">│</span>
                      {p.b}
                    </span>
                    <span
                      className={`font-bold ${p.em < 0 ? "text-kl-red" : "text-kl-blue"}`}
                    >
                      {p.em >= 0 ? "+" : ""}
                      {p.em.toFixed(3)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <p className="mt-5 max-w-prose text-xs text-kl-muted">
          各文字を字面(インク)単位で計測し、隣り合う字面のあいだのネガティブスペースの面積が均等に見えるよう左右間隔を最適化しています（A/Vのような字形は自動でつめられます）。上下左右の余白は字面の高さから比率で生成し光学中央に配置。SVGはWebフォントを参照するベクターです。エディタで「アウトライン化」すれば完全に自己完結したロゴになります。
        </p>
      </div>
    </div>
  );
}
