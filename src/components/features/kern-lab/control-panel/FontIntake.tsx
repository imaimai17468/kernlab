import { useRef, useState, useSyncExternalStore } from "react";
import type { CustomFontPhase, FontIntakeItem } from "../engine/customFonts";
import {
  dismissCustomFontError,
  dismissCustomFontNotice,
  FONT_FILE_ACCEPT,
  intakeItemsOf,
} from "../engine/customFonts";
import { useCustomFonts } from "../useCustomFonts";
import { LocalFontPicker } from "./LocalFontPicker";
import type { LocalFontPickerState } from "./localFonts";
import { dedupeByFamily } from "./localFonts";

const actionClass =
  "border border-kl-ink bg-kl-panel px-3 py-1.5 text-xs text-kl-ink transition-colors duration-150 ease-out hover:bg-kl-ink/5 active:bg-kl-ink/10 active:duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none max-sm:min-h-11";

const dismissClass =
  "kl-hit-area text-xs underline decoration-from-font underline-offset-4 transition-opacity duration-150 ease-out hover:text-kl-ink active:opacity-60 active:duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none";

const BUSY_LABELS: Partial<Record<CustomFontPhase, string>> = {
  restoring: "保存済みのフォントを復元しています…",
  parsing: "フォントを読み込んでいます…",
  registering: "フォントを登録しています…",
  persisting: "フォントを保存しています…",
  removing: "フォントを削除しています…",
};

const noopSubscribe = () => () => {};

type FontIntakeProps = {
  onAddFonts: (items: readonly FontIntakeItem[]) => void;
  onRemoveFont: (name: string) => void;
};

/**
 * Custom-font intake: file picker (+ the canvas accepts drops), the
 * installed-font picker where the Local Font Access API exists, the privacy
 * notice, and the registered-font rows with removal. States mirror
 * specs/custom-fonts.spec.md; the machine itself lives in engine/customFonts.
 */
export function FontIntake({ onAddFonts, onRemoveFont }: FontIntakeProps) {
  const snapshot = useCustomFonts();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [picker, setPicker] = useState<LocalFontPickerState | null>(null);
  // Two-step removal (design rule: destructive actions need confirmation).
  const [confirming, setConfirming] = useState<string | null>(null);
  // Query generation: a resolution only applies to the query that started it,
  // so a close-and-reopen can't be overwritten by the stale first query.
  const querySeq = useRef(0);

  const canQueryLocal = useSyncExternalStore(
    noopSubscribe,
    () => "queryLocalFonts" in window,
    () => false
  );

  const closePicker = () => {
    querySeq.current += 1;
    setPicker(null);
  };

  // The query runs here, inside the click — queryLocalFonts' permission
  // prompt requires the gesture's transient activation.
  const togglePicker = () => {
    if (picker !== null) {
      closePicker();
      return;
    }
    const list = window.queryLocalFonts;
    if (!list) return;
    querySeq.current += 1;
    const seq = querySeq.current;
    setPicker({ status: "loading" });
    list().then(
      (fonts) => {
        if (seq !== querySeq.current) return;
        setPicker({ status: "ready", families: dedupeByFamily(fonts) });
      },
      () => {
        if (seq !== querySeq.current) return;
        setPicker({
          status: "error",
          message:
            "フォント一覧を取得できませんでした（許可が必要です）。ファイルからの追加はご利用いただけます",
        });
      }
    );
  };

  // A cold visit with nothing stored settles restoring in one tick — showing
  // its label then would just flash noise on every load.
  const silentRestore =
    snapshot.phase === "restoring" && snapshot.fonts.length === 0;
  const busyLabel = silentRestore ? undefined : BUSY_LABELS[snapshot.phase];
  const queuedSuffix =
    snapshot.queued > 0 ? `（残り ${snapshot.queued} 件）` : "";

  return (
    <div className="flex flex-col gap-2 border-t border-kl-ink pt-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="text-xs font-bold">カスタムフォント</span>
        <button
          type="button"
          className={actionClass}
          onClick={() => fileRef.current?.click()}
        >
          ファイルを追加（.ttf / .otf / .woff）
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={FONT_FILE_ACCEPT}
          multiple
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onAddFonts(intakeItemsOf(files));
            e.target.value = "";
          }}
        />
        {canQueryLocal && (
          <button type="button" className={actionClass} onClick={togglePicker}>
            端末のフォントから選ぶ
          </button>
        )}
        <span className="text-xs text-kl-muted">
          フォントはこの端末内でのみ処理・保存され、サーバーへは送信されません
        </span>
      </div>

      {busyLabel !== undefined && (
        <p className="text-xs text-kl-muted" role="status">
          {busyLabel}
          {queuedSuffix}
        </p>
      )}

      {snapshot.error !== null && (
        <p className="text-xs text-kl-red" role="alert">
          {snapshot.error}{" "}
          <button
            type="button"
            className={`${dismissClass} text-kl-red`}
            onClick={dismissCustomFontError}
          >
            閉じる
          </button>
        </p>
      )}

      {snapshot.notices.map((notice) => (
        <p key={notice.id} className="text-xs text-kl-muted" role="status">
          {notice.message}{" "}
          <button
            type="button"
            className={`${dismissClass} text-kl-muted`}
            onClick={() => dismissCustomFontNotice(notice.id)}
          >
            閉じる
          </button>
        </p>
      ))}

      {picker !== null && (
        <LocalFontPicker
          state={picker}
          onPick={(item) => onAddFonts([item])}
          onClose={closePicker}
        />
      )}

      {snapshot.fonts.length === 0 && busyLabel === undefined && (
        <p className="text-xs text-kl-muted">
          追加したフォントはここに表示されます
        </p>
      )}

      {snapshot.fonts.length > 0 && (
        <ul className="flex flex-col">
          {snapshot.fonts.map((font) => (
            <li
              key={font.name}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1"
            >
              <span className="text-xs">{font.name}</span>
              <span className="font-kl-mono text-xs text-kl-muted">
                {font.variable
                  ? `可変 ${font.weights[0]}–${font.weights[font.weights.length - 1]}`
                  : font.weights.join(" / ")}
              </span>
              {confirming === font.name ? (
                <>
                  <button
                    type="button"
                    className={`${dismissClass} text-kl-red`}
                    disabled={snapshot.phase !== "idle"}
                    onClick={() => {
                      setConfirming(null);
                      onRemoveFont(font.name);
                    }}
                  >
                    削除する
                  </button>
                  <button
                    type="button"
                    className={`${dismissClass} text-kl-muted`}
                    onClick={() => setConfirming(null)}
                  >
                    やめる
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`${dismissClass} text-kl-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline`}
                  disabled={snapshot.phase !== "idle"}
                  onClick={() => setConfirming(font.name)}
                >
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
