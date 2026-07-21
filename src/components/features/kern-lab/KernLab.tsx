"use client";

import { useReducer } from "react";
import { CanvasStage } from "./CanvasStage";
import { ControlPanel } from "./ControlPanel";
import type { ControlsPatch } from "./controls";
import { controlsReducer, INITIAL_CONTROLS } from "./controls";
import { ExportBar } from "./ExportBar";
import { injectFontsStylesheet, loadFont } from "./fontLoader";
import { PairReadout } from "./PairReadout";
import "./styles.css";
import { useKernLab } from "./useKernLab";

// App-level initialization: runs once per page load, not per mount (and is a
// no-op during SSR). The default font starts loading before first paint.
injectFontsStylesheet();
loadFont(INITIAL_CONTROLS.family, INITIAL_CONTROLS.weight);

export function KernLab() {
  const [controls, dispatch] = useReducer(controlsReducer, INITIAL_CONTROLS);

  // Every control change goes through here; picking a font also kicks off its
  // load — a side effect belonging to the event, not to an effect watching state.
  const updateControls = (patch: ControlsPatch) => {
    dispatch(patch);
    if (patch.family !== undefined || patch.weight !== undefined) {
      const next = controlsReducer(controls, patch);
      loadFont(next.family, next.weight);
    }
  };

  const engine = useKernLab(controls);

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

        <CanvasStage
          canvasRef={engine.canvasRef}
          stageRef={engine.stageRef}
          fontReady={engine.fontReady}
        />

        <div className="mt-4 grid grid-cols-1 gap-4">
          <ControlPanel controls={controls} onChange={updateControls} />
          <ExportBar
            canExport={engine.canExport}
            onExportPng={engine.exportPng}
            onExportSvg={engine.exportSvg}
          />
          <PairReadout pairs={engine.pairs} mode={controls.mode} />
        </div>

        <p className="mt-5 max-w-prose text-xs text-kl-muted">
          各文字を字面(インク)単位で計測し、隣り合う字面のあいだのネガティブスペースの面積が均等に見えるよう左右間隔を最適化しています（A/Vのような字形は自動でつめられます）。上下左右の余白は字面の高さから比率で生成し光学中央に配置。SVGはWebフォントを参照するベクターです。エディタで「アウトライン化」すれば完全に自己完結したロゴになります。
        </p>
      </div>
    </div>
  );
}
