type SliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  left: string;
  right: string;
};

/** 0–1 range control with a left/right intent caption. */
export function Slider({ label, value, onChange, left, right }: SliderProps) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-medium tracking-wide text-kl-muted">
        <span>{label}</span>
        <span>
          {left} · {right}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="kl-range w-full"
      />
    </div>
  );
}
