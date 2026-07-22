import type { DragEvent, Ref, RefObject } from "react";
import { useState } from "react";
import { Corner } from "@/components/shared/corner/Corner";
import type { FontIntakeItem } from "./engine/customFonts";
import { intakeItemsOf } from "./engine/customFonts";

type CanvasStageProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: Ref<HTMLDivElement>;
  fontReady: boolean;
  onDropFonts: (items: readonly FontIntakeItem[]) => void;
};

/**
 * The bordered canvas preview: registration corners, a loading fallback, and
 * a drop target for custom font files (same intake path as the file picker —
 * unsupported files surface the intake error, never a silent no-op).
 */
export function CanvasStage({
  canvasRef,
  stageRef,
  fontReady,
  onDropFonts,
}: CanvasStageProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onDropFonts(intakeItemsOf(files));
  };

  return (
    <div
      ref={stageRef}
      className={`kl-canvas-box relative overflow-hidden border bg-kl-paper ${
        dragging ? "border-kl-blue" : "border-kl-ink"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {!fontReady && (
        <div className="absolute inset-0 grid place-items-center text-xs text-kl-muted transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none">
          フォント読み込み中…
        </div>
      )}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="カーニング調整済みロゴのプレビュー"
        className="block"
      />
      {dragging && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-kl-paper text-xs text-kl-blue">
          フォントファイルを追加
        </div>
      )}
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
    </div>
  );
}
