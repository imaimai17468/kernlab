import type { Mode, Pair } from "./types";

type PairReadoutProps = {
  pairs: Pair[];
  mode: Mode;
};

/** Per-pair adjustment readout (em, signed) for optical mode. */
export function PairReadout({ pairs, mode }: PairReadoutProps) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium tracking-wide text-kl-muted">
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
          pairs.map((p) => (
            <div
              key={`${p.index}-${p.a}-${p.b}`}
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
  );
}
