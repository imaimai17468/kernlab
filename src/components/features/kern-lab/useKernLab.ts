import type { Ref, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { MS, PAPER } from "./engine/constants";
import type { Controls } from "./engine/controls";
import {
  getCustomFontsGeneration,
  subscribeCustomFonts,
} from "./engine/customFonts";
import { exportPNG, exportSVG } from "./engine/export";
import { isFontSettled, subscribeFonts } from "./engine/fontLoader";
import { computeLayout } from "./engine/kerning";
import { renderToContext } from "./engine/render";
import type { Pair } from "./engine/types";
import { useCustomFonts } from "./useCustomFonts";

type UseKernLabResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: Ref<HTMLDivElement>;
  fontReady: boolean;
  pairs: Pair[];
  canExport: boolean;
  exportPng: (transparent: boolean) => void;
  exportSvg: () => void;
  /** Set when SVG export is unavailable for the selected font. */
  svgDisabledReason: string | undefined;
};

/**
 * The canvas engine behind KERN LAB.
 *
 * - `fontReady` subscribes to the module font store (useSyncExternalStore); the
 *   server snapshot is `false`, which doubles as the SSR/hydration guard.
 * - `layout`/`pairs` are derived during render (useMemo). computeLayout uses an
 *   offscreen canvas purely as a measuring instrument and memoizes per glyph,
 *   so it is idempotent for a settled font spec.
 * - The single effect syncs the visible canvas (an external system) with the
 *   computed layout; the ResizeObserver lives in a callback ref (React 19
 *   cleanup) and just re-runs the same draw on box resize.
 */
export function useKernLab(controls: Controls): UseKernLabResult {
  const { text, family, weight, tightness, frame, mode, showArea, showGuides } =
    controls;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<() => void>(() => {});

  const fontReady = useSyncExternalStore(
    subscribeFonts,
    () => isFontSettled(family, weight, text),
    () => false
  );

  // A same-name custom-font replacement changes the rendered faces (and
  // clears the glyph cache) without changing any control value — the registry
  // generation is the render input that forces the recompute.
  const fontsGeneration = useSyncExternalStore(
    subscribeCustomFonts,
    getCustomFontsGeneration,
    () => 0
  );

  const layout = useMemo(() => {
    // Read (not used) so registry mutations invalidate the memo: a swap
    // changes what the same {family, weight} measures to.
    void fontsGeneration;
    return fontReady
      ? computeLayout({ text, family, weight, tightness, frame, mode })
      : null;
  }, [
    fontReady,
    fontsGeneration,
    text,
    family,
    weight,
    tightness,
    frame,
    mode,
  ]);

  const pairs = useMemo<Pair[]>(
    () => layout?.pairInfo.map((p) => ({ ...p, em: p.s / MS })) ?? [],
    [layout]
  );

  // Sync the on-screen canvas with the computed layout (external system).
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const w = Math.max(320, wrap.clientWidth);
      const h = Math.max(280, wrap.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (layout) {
        renderToContext(ctx, layout, {
          W: w,
          H: h,
          dpr,
          transparent: false,
          showArea,
          showGuides,
          fit: 0.92,
        });
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    drawRef.current = draw;
    draw();
  }, [layout, showArea, showGuides]);

  // Observe the stage box and redraw at the new size (ref cleanup, no effect).
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    wrapRef.current = el;
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(el);
    return () => {
      observer.disconnect();
      wrapRef.current = null;
    };
  }, []);

  const exportPng = (transparent: boolean) => {
    if (layout) exportPNG(layout, text, family, transparent);
  };
  const exportSvg = () => {
    if (layout) exportSVG(layout, text, family);
  };
  const canExport = layout !== null;

  // opentype.js outlines only a variable font's default master, so SVG export
  // would emit wrong-weight artwork — disabled with a reason instead.
  const { fonts: customFonts } = useCustomFonts();
  const svgDisabledReason = customFonts.find((f) => f.name === family)?.variable
    ? "バリアブルフォントのSVG書き出しは未対応です。PNGをご利用ください"
    : undefined;

  return {
    canvasRef,
    stageRef,
    fontReady,
    pairs,
    canExport,
    exportPng,
    exportSvg,
    svgDisabledReason,
  };
}
