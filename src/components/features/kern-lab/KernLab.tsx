"use client";

import { Link } from "@tanstack/react-router";
import { useReducer } from "react";
import { ACCENT_LINK_CLASS } from "@/components/shared/external-link/accentLinkClass";
import { ExternalLink } from "@/components/shared/external-link/ExternalLink";
import { GITHUB_URL } from "@/lib/site";
import { CanvasStage } from "./CanvasStage";
import { ControlPanel } from "./control-panel/ControlPanel";
import type { ControlsPatch } from "./engine/controls";
import { controlsReducer, INITIAL_CONTROLS } from "./engine/controls";
import { injectFontsStylesheet, loadFont } from "./engine/fontLoader";
import { ExportBar } from "./ExportBar";
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

        <footer className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-8 text-xs">
          <p className="text-kl-muted">
            字面（インク）の計測から文字間隔を自動算出するロゴ組版ツール。
          </p>
          <Link to="/how-it-works" className={ACCENT_LINK_CLASS}>
            仕組みはこちら
          </Link>
          <ExternalLink href={GITHUB_URL}>GitHub</ExternalLink>
        </footer>
      </div>
    </div>
  );
}
