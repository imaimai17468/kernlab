import { useState } from "react";
import type { FontIntakeItem } from "../engine/customFonts";
import type { LocalFontPickerState } from "./localFonts";

type LocalFontPickerProps = {
  state: LocalFontPickerState;
  onPick: (item: FontIntakeItem) => void;
  onClose: () => void;
};

/**
 * Installed-font list (Local Font Access API). Purely presentational: the
 * query runs in the opening click handler — the permission prompt needs the
 * user gesture's transient activation, which an effect could outlive. Picking
 * a family reads its blob locally and joins the same intake path as a file.
 */
export function LocalFontPicker({
  state,
  onPick,
  onClose,
}: LocalFontPickerProps) {
  const [query, setQuery] = useState("");

  const shown =
    state.status === "ready"
      ? state.families.filter((f) =>
          f.family.toLowerCase().includes(query.trim().toLowerCase())
        )
      : [];

  return (
    <div className="flex flex-col gap-2 border border-kl-ink bg-kl-panel p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold">端末のフォント</span>
        <button
          type="button"
          className="kl-hit-area text-xs text-kl-muted underline decoration-from-font underline-offset-4 transition-colors duration-150 ease-out hover:text-kl-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
      {state.status === "loading" && (
        <p className="text-xs text-kl-muted" role="status">
          フォント一覧を取得しています…
        </p>
      )}
      {state.status === "error" && (
        <p className="text-xs text-kl-red" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "ready" && (
        <>
          <input
            className="w-full appearance-none border border-kl-ink bg-kl-panel px-3 py-2 text-xs text-kl-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue"
            value={query}
            aria-label="フォント名で絞り込み"
            placeholder="フォント名で絞り込み"
            onChange={(e) => setQuery(e.target.value)}
          />
          {shown.length === 0 ? (
            <p className="px-1 py-2 text-xs text-kl-muted">
              一致するフォントがありません
            </p>
          ) : (
            <ul className="max-h-44 overflow-y-auto">
              {shown.map((font) => (
                <li key={font.family}>
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-xs transition duration-150 ease-out hover:bg-kl-paper active:opacity-60 active:duration-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none max-sm:min-h-11"
                    onClick={() => {
                      onPick({
                        readBytes: () =>
                          font.blob().then((blob) => blob.arrayBuffer()),
                        fallbackName: font.family,
                      });
                      onClose();
                    }}
                  >
                    {font.family}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
