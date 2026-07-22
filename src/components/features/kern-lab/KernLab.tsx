"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import { ACCENT_LINK_CLASS } from "@/components/shared/external-link/accentLinkClass";
import { ExternalLink } from "@/components/shared/external-link/ExternalLink";
import { GITHUB_URL } from "@/lib/site";
import { CanvasStage } from "./CanvasStage";
import { ControlPanel } from "./control-panel/ControlPanel";
import type { Controls, ControlsPatch } from "./engine/controls";
import { controlsReducer, INITIAL_CONTROLS } from "./engine/controls";
import type { FontIntakeItem } from "./engine/customFonts";
import {
  addFontIntakes,
  removeCustomFont,
  restoreCustomFonts,
} from "./engine/customFonts";
import { injectUiFontStylesheet, loadFont } from "./engine/fontLoader";
import { ExportBar } from "./ExportBar";
import { PairReadout } from "./PairReadout";
import "./styles.css";
import { useKernLab } from "./useKernLab";

// App-level initialization: runs once per page load, not per mount (and is a
// no-op during SSR). The default font starts loading and the persisted custom
// fonts start restoring before first paint.
injectUiFontStylesheet();
loadFont(
  INITIAL_CONTROLS.family,
  INITIAL_CONTROLS.weight,
  INITIAL_CONTROLS.text
);
restoreCustomFonts();

export function KernLab() {
  const [controls, dispatch] = useReducer(controlsReducer, INITIAL_CONTROLS);

  // Latest-ref: custom-font intake/removal settle asynchronously and must
  // reconcile against the controls at completion time, not at dispatch time.
  // updateControls advances the ref synchronously with dispatch (the reducer
  // is pure, so both compute the same next state) — an async completion
  // landing between a dispatch and its commit still reads the true value; the
  // sync effect re-anchors after every commit.
  const controlsRef = useRef<Controls>(controls);
  useEffect(() => {
    controlsRef.current = controls;
  });

  // Every control change goes through here; picking a font or typing new
  // characters also kicks off the needed face loads — a side effect belonging
  // to the event, not to an effect watching state.
  const updateControls = (patch: ControlsPatch) => {
    const next = controlsReducer(controlsRef.current, patch);
    controlsRef.current = next;
    dispatch(patch);
    if (
      patch.family !== undefined ||
      patch.weight !== undefined ||
      patch.text !== undefined
    ) {
      loadFont(next.family, next.weight, next.text);
    }
  };

  // Event-site duties from specs/custom-fonts.spec.md: a same-name
  // replacement re-clamps the selected weight; removing the selected family
  // falls back to the built-in default.
  const addFonts = (items: readonly FontIntakeItem[]) => {
    addFontIntakes(items, (registered) => {
      const current = controlsRef.current;
      if (
        current.family === registered.name &&
        !registered.weights.includes(current.weight)
      ) {
        updateControls({ weight: registered.weights[0] });
      }
    });
  };
  const removeFont = (name: string) => {
    void removeCustomFont(name).then(({ removed }) => {
      if (removed && controlsRef.current.family === name) {
        updateControls({
          family: INITIAL_CONTROLS.family,
          weight: INITIAL_CONTROLS.weight,
        });
      }
    });
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
          onDropFonts={addFonts}
        />

        <div className="mt-4 grid grid-cols-1 gap-4">
          <ControlPanel
            controls={controls}
            onChange={updateControls}
            onAddFonts={addFonts}
            onRemoveFont={removeFont}
          />
          <ExportBar
            canExport={engine.canExport}
            onExportPng={engine.exportPng}
            onExportSvg={engine.exportSvg}
            svgDisabledReason={engine.svgDisabledReason}
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
