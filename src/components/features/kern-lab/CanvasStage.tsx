import type { Ref, RefObject } from "react";
import { Corner } from "./Corner";

type CanvasStageProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: Ref<HTMLDivElement>;
  fontReady: boolean;
};

/** The bordered canvas preview: registration corners + a loading fallback. */
export function CanvasStage({
  canvasRef,
  stageRef,
  fontReady,
}: CanvasStageProps) {
  return (
    <div
      ref={stageRef}
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
  );
}
