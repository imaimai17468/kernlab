import type { Ref, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { MS, PAPER } from "./constants";
import type { Controls } from "./controls";
import { exportPNG, exportSVG } from "./export";
import { isFontSettled, subscribeFonts } from "./fontLoader";
import { computeLayout } from "./kerning";
import { renderToContext } from "./render";
import type { Pair } from "./types";

type UseKernLabResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: Ref<HTMLDivElement>;
  fontReady: boolean;
  pairs: Pair[];
  canExport: boolean;
  exportPng: (transparent: boolean) => void;
  exportSvg: () => void;
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
    () => isFontSettled(family, weight),
    () => false
  );

  const layout = useMemo(
    () =>
      fontReady
        ? computeLayout({ text, family, weight, tightness, frame, mode })
        : null,
    [fontReady, text, family, weight, tightness, frame, mode]
  );

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

  return {
    canvasRef,
    stageRef,
    fontReady,
    pairs,
    canExport,
    exportPng,
    exportSvg,
  };
}
