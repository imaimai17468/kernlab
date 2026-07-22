import { FONTS } from "../engine/constants";
import type { Controls, ControlsPatch } from "../engine/controls";
import { weightsOf } from "../engine/controls";
import type { FontIntakeItem } from "../engine/customFonts";
import { Field } from "./Field";
import { FontIntake } from "./FontIntake";
import { Slider } from "./Slider";
import { Toggle } from "./Toggle";
import { useCustomFonts } from "../useCustomFonts";

const inputClass =
  "w-full appearance-none border border-kl-ink bg-kl-panel px-3 py-2.5 text-sm text-kl-ink transition-colors duration-150 ease-out hover:bg-kl-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none max-sm:min-h-11";

type ControlPanelProps = {
  controls: Controls;
  onChange: (patch: ControlsPatch) => void;
  onAddFonts: (items: readonly FontIntakeItem[]) => void;
  onRemoveFont: (name: string) => void;
};

/** The control panel: text/font/weight fields, spacing sliders, view toggles. */
export function ControlPanel({
  controls,
  onChange,
  onAddFonts,
  onRemoveFont,
}: ControlPanelProps) {
  const { fonts: customFonts } = useCustomFonts();
  const selectedCustom = customFonts.find((f) => f.name === controls.family);
  const weights = selectedCustom?.weights ??
    weightsOf(controls.family) ?? [controls.weight];

  // Weight validity for a custom family is the event site's duty
  // (specs/custom-fonts.spec.md): the pure reducer only clamps built-ins.
  const changeFamily = (name: string) => {
    const custom = customFonts.find((f) => f.name === name);
    if (custom && !custom.weights.includes(controls.weight)) {
      onChange({ family: name, weight: custom.weights[0] });
      return;
    }
    onChange({ family: name });
  };

  return (
    <>
      <div className="grid grid-cols-kl-top items-end gap-3 max-sm:grid-cols-2">
        <Field label="ロゴ文字" className="max-sm:col-span-2">
          <input
            className={inputClass}
            value={controls.text}
            aria-label="ロゴ文字"
            placeholder="文字を入力"
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </Field>
        <Field label="フォント">
          <select
            className={inputClass}
            value={controls.family}
            aria-label="フォント"
            onChange={(e) => changeFamily(e.target.value)}
          >
            {FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name} — {f.note}
              </option>
            ))}
            {customFonts.length > 0 && (
              <optgroup label="カスタム">
                {customFonts.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
        <Field label="ウェイト">
          <select
            className={`${inputClass} min-w-24`}
            value={controls.weight}
            aria-label="ウェイト"
            onChange={(e) => onChange({ weight: Number(e.target.value) })}
          >
            {weights.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-kl-ctrl items-center gap-5 max-sm:grid-cols-1 max-sm:gap-4">
        <Slider
          label="字間（つめ / あき）"
          value={controls.tightness}
          onChange={(v) => onChange({ tightness: v })}
          left="つめ"
          right="あき"
        />
        <Slider
          label="額縁の余白（上下左右）"
          value={controls.frame}
          onChange={(v) => onChange({ frame: v })}
          left="狭"
          right="広"
        />
        <div className="flex flex-wrap gap-2 max-sm:*:flex-1">
          <Toggle
            on={controls.showArea}
            onToggle={() => onChange({ showArea: !controls.showArea })}
          >
            余白の面積
          </Toggle>
          <Toggle
            on={controls.showGuides}
            onToggle={() => onChange({ showGuides: !controls.showGuides })}
          >
            ガイド
          </Toggle>
          <Toggle
            on={controls.mode === "native"}
            onToggle={() =>
              onChange({
                mode: controls.mode === "optical" ? "native" : "optical",
              })
            }
            accent="blue"
          >
            標準と比較
          </Toggle>
        </div>
      </div>

      <FontIntake onAddFonts={onAddFonts} onRemoveFont={onRemoveFont} />
    </>
  );
}
