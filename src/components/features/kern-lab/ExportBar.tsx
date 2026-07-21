const exportBtnClass =
  "cursor-pointer appearance-none border border-kl-ink bg-kl-panel px-3.5 py-2 font-kl-mono text-xs font-bold transition duration-150 ease-out hover:bg-kl-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-kl-panel motion-reduce:transition-none max-sm:flex-1 max-sm:text-center";

type ExportBarProps = {
  canExport: boolean;
  onExportPng: (transparent: boolean) => void;
  onExportSvg: () => void;
};

/** PNG/SVG export actions for the current layout. */
export function ExportBar({
  canExport,
  onExportPng,
  onExportSvg,
}: ExportBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-kl-ink pt-3.5">
      <span className="text-xs font-medium tracking-wide text-kl-muted">
        書き出し
      </span>
      <button
        type="button"
        className={exportBtnClass}
        disabled={!canExport}
        onClick={() => onExportPng(true)}
      >
        PNG（透過）
      </button>
      <button
        type="button"
        className={exportBtnClass}
        disabled={!canExport}
        onClick={() => onExportPng(false)}
      >
        PNG（用紙）
      </button>
      <button
        type="button"
        className={`${exportBtnClass} text-kl-blue`}
        disabled={!canExport}
        onClick={onExportSvg}
      >
        SVG（ベクター）
      </button>
      <span className="text-xs text-kl-muted max-sm:hidden">
        PNGは字面から最適サイズ・約2400px幅で出力／SVGはフォント埋め込み
      </span>
    </div>
  );
}
