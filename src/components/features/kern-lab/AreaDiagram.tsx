// Step-2 diagram: the negative space between two adjacent ink edges, summed
// row by row with an upper bound (the red overlay the tool itself renders).
const ROWS = [
  { y: 46, aRight: 67, vLeft: 253 },
  { y: 70, aRight: 77, vLeft: 243 },
  { y: 94, aRight: 87, vLeft: 233 },
  { y: 118, aRight: 97, vLeft: 223 },
  { y: 142, aRight: 107, vLeft: 213 },
];
const CAP = 120;

export function AreaDiagram() {
  return (
    <svg
      viewBox="0 0 320 190"
      role="img"
      aria-label="隣り合う2つの字面のあいだのネガティブスペースを行ごとに赤い帯で示し、離れすぎた行は上限 cap で打ち切る図"
      className="block w-full"
    >
      {/* left glyph's right leg / right glyph's left leg */}
      <g className="stroke-kl-ink" strokeWidth="15">
        <path d="M52 30 L108 162" />
        <path d="M268 30 L212 162" />
      </g>
      {/* per-row negative space, capped */}
      {ROWS.map(({ y, aRight, vLeft }) => (
        <rect
          key={y}
          x={aRight}
          y={y - 6}
          width={Math.min(vLeft - aRight, CAP)}
          height="12"
          className="fill-kl-red-tint"
        />
      ))}
      {/* cap boundary through the truncated rows */}
      <polyline
        points="187,38 197,70 207,94 217,126"
        fill="none"
        className="stroke-kl-red"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <text x="192" y="30" className="fill-kl-red font-kl-mono text-xs">
        cap
      </text>
      {/* the solved spacing s between the two ink boxes */}
      <line
        x1="108"
        y1="176"
        x2="212"
        y2="176"
        className="stroke-kl-ink"
        strokeWidth="1"
      />
      <polygon points="108,176 116,172.5 116,179.5" className="fill-kl-ink" />
      <polygon points="212,176 204,172.5 204,179.5" className="fill-kl-ink" />
      <text x="154" y="171" className="fill-kl-ink font-kl-mono text-xs">
        s
      </text>
    </svg>
  );
}
